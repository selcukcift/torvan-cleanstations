# Advanced Database Features Migration

This migration adds advanced database features for production-ready operation:

## Applied Features
✅ **Database Functions** - Automatic calculations and business logic
✅ **Database Triggers** - Automatic data management and audit logging  
✅ **Check Constraints** - Data validation at database level
✅ **Performance Indexes** - Optimized queries for production
✅ **Database Views** - Pre-calculated statistics and alerts

## Applied via Migration Script
The features below were applied using `scripts/apply-advanced-features-v3.js`:

-- Add check constraints for data validation
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_quantityOnHand_check" CHECK ("quantityOnHand" >= 0);
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_quantityReserved_check" CHECK ("quantityReserved" >= 0);
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_quantityAvailable_check" CHECK ("quantityAvailable" >= 0);
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_size_check" CHECK ("size" > 0);

-- Create function for automatic inventory available calculation
CREATE OR REPLACE FUNCTION update_inventory_available()
RETURNS TRIGGER AS $$
BEGIN
    NEW."quantityAvailable" = NEW."quantityOnHand" - NEW."quantityReserved";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory available calculation
CREATE TRIGGER inventory_available_trigger
    BEFORE INSERT OR UPDATE ON "InventoryItem"
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_available();

-- Create audit log trigger function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create audit log if we're not already in an audit context
    IF current_setting('app.skip_audit', true) IS DISTINCT FROM 'true' THEN
        INSERT INTO "AuditLog" (
            "action",
            "entityType",
            "entityId",
            "oldValues",
            "newValues",
            "createdAt"
        ) VALUES (
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW."id", OLD."id"),
            CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
            CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
            CURRENT_TIMESTAMP
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to important tables
CREATE TRIGGER audit_order_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Order"
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_task_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "Task"
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_user_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_inventory_trigger
    AFTER INSERT OR UPDATE OR DELETE ON "InventoryItem"
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Create function to update user assigned tasks array
CREATE OR REPLACE FUNCTION update_user_assigned_tasks()
RETURNS TRIGGER AS $$
BEGIN
    -- Update old assignee (remove task)
    IF OLD."assignedToId" IS NOT NULL THEN
        UPDATE "User" 
        SET "assignedTaskIds" = array_remove("assignedTaskIds", OLD."id")
        WHERE "id" = OLD."assignedToId";
    END IF;
    
    -- Update new assignee (add task)
    IF NEW."assignedToId" IS NOT NULL THEN
        UPDATE "User" 
        SET "assignedTaskIds" = array_append("assignedTaskIds", NEW."id")
        WHERE "id" = NEW."assignedToId" 
        AND NOT (NEW."id" = ANY("assignedTaskIds"));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task assignment updates
CREATE TRIGGER task_assignment_trigger
    AFTER INSERT OR UPDATE OF "assignedToId" ON "Task"
    FOR EACH ROW
    EXECUTE FUNCTION update_user_assigned_tasks();

-- Create function to clean up task assignments on deletion
CREATE OR REPLACE FUNCTION cleanup_task_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove task from user's assigned tasks array
    IF OLD."assignedToId" IS NOT NULL THEN
        UPDATE "User" 
        SET "assignedTaskIds" = array_remove("assignedTaskIds", OLD."id")
        WHERE "id" = OLD."assignedToId";
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task deletion cleanup
CREATE TRIGGER task_deletion_cleanup_trigger
    AFTER DELETE ON "Task"
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_task_assignments();

-- Create function to validate task dependencies (prevent circular dependencies)
CREATE OR REPLACE FUNCTION validate_task_dependency()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if adding this dependency would create a cycle
    IF EXISTS (
        WITH RECURSIVE dependency_chain AS (
            -- Start with the new dependency
            SELECT NEW."dependsOnId" as task_id, NEW."taskId" as depends_on
            UNION ALL
            -- Follow the chain of dependencies
            SELECT td."dependsOnId", dc.task_id
            FROM "TaskDependency" td
            JOIN dependency_chain dc ON td."taskId" = dc.depends_on
        )
        SELECT 1 FROM dependency_chain WHERE task_id = NEW."taskId"
    ) THEN
        RAISE EXCEPTION 'Circular dependency detected: Task % cannot depend on task %', 
            NEW."taskId", NEW."dependsOnId";
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dependency validation
CREATE TRIGGER validate_dependency_trigger
    BEFORE INSERT OR UPDATE ON "TaskDependency"
    FOR EACH ROW
    EXECUTE FUNCTION validate_task_dependency();

-- Create index for performance optimization on common queries
CREATE INDEX IF NOT EXISTS "User_assignedTaskIds_gin_idx" ON "User" USING GIN ("assignedTaskIds");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "InventoryItem_quantityAvailable_idx" ON "InventoryItem" ("quantityAvailable") WHERE "quantityAvailable" < 10;

-- Create view for task summary statistics
CREATE OR REPLACE VIEW task_summary_stats AS
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'BLOCKED') as blocked_tasks,
    COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent_tasks,
    COUNT(*) FILTER (WHERE priority = 'HIGH') as high_priority_tasks,
    AVG(CASE WHEN "completedAt" IS NOT NULL AND "startedAt" IS NOT NULL 
        THEN EXTRACT(EPOCH FROM "completedAt" - "startedAt")/60 
        ELSE NULL END) as avg_completion_time_minutes
FROM "Task";

-- Create view for inventory alerts
CREATE OR REPLACE VIEW inventory_alerts AS
SELECT 
    ii.*,
    p."name" as part_name,
    CASE 
        WHEN ii."quantityAvailable" <= 0 THEN 'OUT_OF_STOCK'
        WHEN ii."reorderPoint" IS NOT NULL AND ii."quantityAvailable" <= ii."reorderPoint" THEN 'LOW_STOCK'
        WHEN ii."maxStock" IS NOT NULL AND ii."quantityOnHand" >= ii."maxStock" THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END as alert_level
FROM "InventoryItem" ii
LEFT JOIN "Part" p ON ii."partId" = p."partId"
WHERE ii."quantityAvailable" <= COALESCE(ii."reorderPoint", 5)
   OR (ii."maxStock" IS NOT NULL AND ii."quantityOnHand" >= ii."maxStock");

-- Grant appropriate permissions
GRANT SELECT ON task_summary_stats TO PUBLIC;
GRANT SELECT ON inventory_alerts TO PUBLIC;