"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AdminNav } from "@/components/admin-nav"
import { Settings, Logs, Wifi, Database, Save, RefreshCw } from "lucide-react"
import useCsrf from "@/components/hooks/useCsrf"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

export default function IoTSettingsPage() {
  const { ensureCsrf, fetchWithCsrf } = useCsrf()
  const [deviceSettings, setDeviceSettings] = useState({
    initial_retry_timeout: "30",
    max_retry: "10",
    message_interval_seconds: "5",
    herd_ready: "false",
  })

  const [iotServerSettings, setIotServerSettings] = useState({
    iot_connection_string: "HostName=",
    iot_primary_key_device: "",
    iot_secondary_key_device: "",
    iot_eventhub_connection_string: "Endpoint=sb://iothub-"
  })



  const [saved, setSaved] = useState(false)

  const [dbInfo, setDbInfo] = useState({ host: "Loading...", dbName: "Loading..." })

  useEffect(() => {
    fetch("/api/database/info")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch database info")
        return res.json()
      })
      .then((data) => setDbInfo({ host: data.host ?? "Unknown", dbName: data.dbName ?? "Unknown" }))
      .catch(() => setDbInfo({ host: "Unknown", dbName: "Unknown" }))
  }, [])

  const handleSaveSettings = async () => {
    await ensureCsrf()
    // For each values in deviceSettings and iotServerSettings, save to .env file via API route
    for (const [key, value] of Object.entries(deviceSettings)) {
      await ensureCsrf()
      const statsResponse  = await fetchWithCsrf("/api/dotenv", {
          method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
          body: JSON.stringify({ variable: key.toUpperCase(), value })
      }).catch((err: Error) => {
        console.error(`Failed to save setting ${key}:`, err)
      })
      if (statsResponse && statsResponse.ok) {
        const data = await statsResponse.json()
        setDeviceSettings(prev => ({ ...prev, [key.toLocaleLowerCase()]: data.value }))
      }
    }

    for (const [key, value] of Object.entries(iotServerSettings)) {
      await ensureCsrf()
      const statsResponse  = await fetchWithCsrf("/api/dotenv", {
          method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
          body: JSON.stringify({ variable: key.toUpperCase(), value })
      }).catch((err: Error) => {
        console.error(`Failed to save setting ${key}:`, err)
      })
      if(statsResponse && statsResponse.ok) {
        const data = await statsResponse.json()
        setIotServerSettings(prev => ({ ...prev, [key.toLocaleLowerCase()]: data.value }))
      }
    }
    setSaved(false)
    
  }

  const handleResetToDefaults = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      setDeviceSettings({
        initial_retry_timeout: "30",
        max_retry: "10",
        message_interval_seconds: "5",
        herd_ready: "false",
      })
      setIotServerSettings({
        iot_connection_string: "",
        iot_primary_key_device: "",
        iot_secondary_key_device: "",
        iot_eventhub_connection_string: ""
      })

    }
  }


  return (
    <div className="min-h-screen bg-background">
      <AdminNav title="IoT Settings" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Simulator Environment Settings</h2>
          <p className="text-muted-foreground">
            Configure device simulator, IoT Hub connection strings.
          </p>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg flex items-center gap-2">
            <Save className="h-5 w-5" />
            <span>Settings saved successfully! </span>
          </div>
        )}

        <div className="space-y-6">
          {/* Device Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Device Settings
              </CardTitle>
              <CardDescription>
                Configure device simulator settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="initial_retry_timeout">Initial Retry Timeout (seconds)</Label>
                  <Input
                    id="initial_retry_timeout"
                    type="number"
                    value={deviceSettings.initial_retry_timeout}
                    onChange={(e) =>
                      setDeviceSettings({ ...deviceSettings, initial_retry_timeout: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="max_retry">Max Retry Timeout (seconds)</Label>
                  <Input
                    id="max_retry"
                    type="number"
                    value={deviceSettings.max_retry}
                    onChange={(e) =>
                      setDeviceSettings({ ...deviceSettings, max_retry: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="message_interval_seconds">Message Interval (seconds)</Label>
                  <Input
                    id="message_interval_seconds"
                    type="number"
                    value={deviceSettings.message_interval_seconds}
                    onChange={(e) =>
                      setDeviceSettings({ ...deviceSettings, message_interval_seconds: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="herd_ready">Herd Ready</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="herd_ready_switch" checked={deviceSettings.herd_ready === "true"} onCheckedChange={(checked) => setDeviceSettings({ ...deviceSettings, herd_ready: checked.toString() })} />
                    <Label htmlFor="herd_ready_switch_label">Azure Batch/ACI/AKS deployed</Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set to "true" to enable herd mode for device simulator
                  </p>
                </div>
              </div>
              
            </CardContent>
          </Card>

          {/* Connection String Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Iot Hub Connection Settings
              </CardTitle>
              <CardDescription>
                Configure Iot Hub Connection Settings and save back to .env file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="iot_connection_string">Iot Hub Connection String for device</Label>
                  <Input
                    id="iot_connection_string"
                    value={iotServerSettings.iot_connection_string}
                    onChange={(e) =>
                      setIotServerSettings({ ...iotServerSettings, iot_connection_string: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="iot_eventhub_connection_string">Iot EventHub Connection String</Label>
                  <Input
                    id="iot_eventhub_connection_string"
                    value={iotServerSettings.iot_eventhub_connection_string}
                    onChange={(e) =>
                      setIotServerSettings({ ...iotServerSettings, iot_eventhub_connection_string: e.target.value })
                    }
                  />
                </div>
                
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="iot_primary_key_device">Iot Primary Key (Device)</Label>
                  <Input
                    id="iot_primary_key_device"
                    value={iotServerSettings.iot_primary_key_device}
                    onChange={(e) =>
                      setIotServerSettings({ ...iotServerSettings, iot_primary_key_device: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="iot_secondary_key_device">Iot Secondary Key (Device)</Label>
                  <Input
                    id="iot_secondary_key_device"
                    value={iotServerSettings.iot_secondary_key_device}
                    onChange={(e) =>
                      setIotServerSettings({ ...iotServerSettings, iot_secondary_key_device: e.target.value })
                    }
                  />
                </div>
                
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div></div>
              </div>
            </CardContent>
          </Card>

          {/* Database Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Settings (Read-Only)
              </CardTitle>
              <CardDescription>
                Configure database connection and storage settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dbHost">Host Name</Label>
                  <Input
                    id="dbHost"
                    value={dbInfo.host}
                    readOnly
                  />
                </div>
                <div>
                  <Label htmlFor="dbName">Database Name</Label>
                  <Input
                    id="dbName"
                    value={dbInfo.dbName}
                    readOnly
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Database connection is configured via environment variables
              </p>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Database Status</h4>
                  <p className="text-sm text-muted-foreground">
                    Connected to MongoDB
                  </p>
                </div>
                { dbInfo.host && dbInfo.dbName && (
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                ) }
                { !(dbInfo.host && dbInfo.dbName) && (
                  <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                ) }
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={handleSaveSettings} size="lg">
              <Save className="mr-2 h-4 w-4" />
              Save All Settings
            </Button>
            <Button onClick={handleResetToDefaults} variant="outline" size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

