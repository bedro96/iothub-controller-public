"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Users, Cpu, ChartSpline, Server, Radio, Database } from "lucide-react"

export default function AdminPage() {
  const router = useRouter()

  const cards = [
    {
      title: "IoT Dashboard",
      description: "Monitor simulator devices at glance. View device status, recent activity, and performance metrics.",
      icon: ChartSpline,
      href: "/iot-dashboard",
    },
    {
      title: "IoT Settings",
      description: "Configure IoT device settings, network options, and notifications.",
      icon: Settings,
      href: "/iot-settings",
    },
    {
      title: "Simulator Control",
      description: "Manage and control IoT device simulators.",
      icon: Cpu,
      href: "/simulator-control",
    },
    {
      title: "User Management",
      description: "View, create, update, and delete user accounts.",
      icon: Users,
      href: "/admin/usermanagement",
    },
    {
      title: "Server Performance",
      description: "Monitor CPU, memory, and network usage of the WebSocket server.",
      icon: Server,
      href: "/server-performance",
    },
    {
      title: "IoT Hub",
      description: "Azure IoT Hub statistics, device registry, and D2C telemetry overview.",
      icon: Radio,
      href: "/iot-hub",
    },
    {
      title: "Database",
      description: "Azure Cosmos DB (MongoDB) collection stats and document counts.",
      icon: Database,
      href: "/database",
    },
    {
      title: "Server Logs",
      description: "View and analyze server logs in real-time.",
      icon: Database,
      href: "/server-logs",
    },
  ]

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Home</h1>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.href}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(card.href)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <CardTitle>{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{card.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}