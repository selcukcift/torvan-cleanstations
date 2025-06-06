"use client"

import { usePathname } from "next/navigation"

export function useNavigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard"
    }
    if (path === "/orders") {
      return pathname === "/dashboard" // Orders section is in dashboard
    }
    return pathname.startsWith(path)
  }

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard"
    if (pathname.startsWith("/orders/create")) return "Create Order"
    if (pathname.startsWith("/orders/edit")) return "Edit Order"
    if (pathname.startsWith("/orders/")) return "Order Details"
    if (pathname === "/orders") return "Orders"
    return "Torvan Medical CleanStation"
  }

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbs = []

    if (segments.length === 0) {
      return [{ label: "Dashboard", href: "/dashboard" }]
    }

    // Build breadcrumbs based on path segments
    let currentPath = ""
    for (let i = 0; i < segments.length; i++) {
      currentPath += `/${segments[i]}`
      
      switch (segments[i]) {
        case "dashboard":
          breadcrumbs.push({ label: "Dashboard", href: "/dashboard" })
          break
        case "orders":
          // Orders section is now in dashboard, so link to dashboard
          if (i === segments.length - 1) {
            breadcrumbs.push({ label: "Dashboard", href: "/dashboard" })
          } else {
            breadcrumbs.push({ label: "Dashboard", href: "/dashboard" })
          }
          break
        case "create":
          breadcrumbs.push({ label: "Create New Order" })
          break
        case "edit":
          breadcrumbs.push({ label: "Edit Order" })
          break
        default:
          // For dynamic segments like [orderId], show as "Order Details"
          if (segments[i - 1] === "orders" && segments[i] !== "create" && segments[i] !== "edit") {
            breadcrumbs.push({ label: "Order Details" })
          }
          break
      }
    }

    return breadcrumbs
  }

  return {
    pathname,
    isActive,
    getPageTitle,
    getBreadcrumbs
  }
}