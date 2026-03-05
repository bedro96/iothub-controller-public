"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AdminNav } from "@/components/admin-nav"
import { Settings, Wifi, Database, Save, RefreshCw, CirclePlay, CircleStop, DatabaseBackup, Computer } from "lucide-react"
import useCsrf from "@/components/hooks/useCsrf"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css";
import { logError } from "@/lib/logger"


export default function SimulatorControl() {
  const { ensureCsrf, fetchWithCsrf } = useCsrf()
  const [deviceSettings, setDeviceSettings] = useState({
    initial_retry_timeout: "30",
    max_retry: "10",
    message_interval_seconds: "5",
    herd_ready: "false",
  })

  const [deviceMapping, setDeviceMapping] = useState({
  issued_out_number_of_devices: "0",
  next_device_id: "simdevice0001",
  active_ws_connection: "0",
  total_ws_connection: "0",
  })

  const [iotServerSettings, setIotServerSettings] = useState({
    iot_connection_string: "HostName=s1toptest01.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=XVYaB+sHrscvTc7JDI6px5o5DAMp635GYAIoTH0hdwg=",
    iot_primary_key_device: "pb4CJgdsz1mGnnvSy7LOt6qLx+0xU6jQCYjkThvWjlY=",
    iot_secondary_key_device: "cxiJ+dGOnvB7PNtz8bkGnWnTM6BBQI2J62DC3CV/wvw=",
    iot_eventhub_connection_string: "Endpoint=sb://ihsuprodseres019dednamespace.servicebus.windows.net/;SharedAccessKeyName=iothubowner;SharedAccessKey=XVYaB+sHrscvTc7JDI6px5o5DAMp635GYAIoTH0hdwg=;EntityPath=iothub-ehub-s1toptest0-56253173-ddac85782f"
  })

  const [devicesToGenerate, setDevicesToGenerate] = useState(1000)
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)


  const handleClearMappings = async () => {
    if (!confirm("Are you sure you want to reset the device mapping table? This will cause all devices to be reassigned starting from simdevice0001.")) return
    try {
      await ensureCsrf()
      const resp = await fetchWithCsrf("/api/devices/clear-mappings", {
        method: 'POST',
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }))
        alert(err.error || 'Failed to clear mappings')
        return
      }
      alert('Device mapping table reset successfully. Device IDs will be reassigned starting from simdevice0001.')
      // Reset device mapping state
      setDeviceMapping({...deviceMapping,
        issued_out_number_of_devices: "0",
        next_device_id: "simdevice0001",
      })
    } catch (e) {
      console.error(e)
      alert('Error resetting device mappings')
    }
  }
  const handleGenerateDevices = async (count = 1000) => {
    if (!confirm(`Generate ${count} simulated devices? This may take a while.`)) return
    try {
      setGenerating(true)
      await ensureCsrf()
      const resp = await fetchWithCsrf(`/api/devices/generate/${count}`, {
        method: 'POST',
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }))
        alert(err.error || 'Failed to generate devices')
        return
      }
      const data = await resp.json().catch(() => ({}))
      alert(`Generated ${data.generated || count} devices`)
      // update issued_out_number_of_devices if present
      setDeviceMapping(prev => ({
        ...prev,
        issued_out_number_of_devices: String(Number(prev.issued_out_number_of_devices || '0') + count),
      }))
    } catch (e) {
      console.error(e)
      alert('Error generating devices')
    } finally {
      setGenerating(false)
    }
  }
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
  const handleRefresh = () => {
    const response = async () => {
      await ensureCsrf()
      const statsResponse = await fetchWithCsrf("/api/connectionmanager/devicemapping/issued", {
        method: "GET",
      }).then((resp) => resp?.ok ? resp.json() : null)
      .catch((err: Error) => {
        console.error("Failed to fetch issued out device count:", err)

      })
      
      if (statsResponse && statsResponse.deviceCount !== undefined) {
        setDeviceMapping(prev => ({ ...prev, issued_out_number_of_devices: String(statsResponse.deviceCount) }))
      }
    }
    const nextIdResponse = async () => {
      await ensureCsrf()
      const statsResponse = await fetchWithCsrf("/api/connectionmanager/devicemapping/nextid", {
        method: "GET",
      }).then((resp) => resp?.ok ? resp.json() : null)
      .catch((err: Error) => {
        console.error("Failed to fetch next device ID:", err)
      })

      if (statsResponse && statsResponse.deviceId !== undefined) {
        setDeviceMapping(prev => ({ ...prev, next_device_id: String(statsResponse.deviceId) }))
      }
    }
    const activeConnectionResponse = async () => {
      await ensureCsrf()
      const statsResponse = await fetchWithCsrf("/api/connectionmanager/clients", {
        method: "GET",
      }).then((resp) => resp?.ok ? resp.json() : null)
      .catch((err: Error) => {
        console.error("Failed to fetch active connection count:", err)
      })

      if (statsResponse && statsResponse.active !== undefined) {
        setDeviceMapping(prev => ({ ...prev, active_ws_connection: String(statsResponse.active), 
                                              total_ws_connection: String(statsResponse.total) }))
      }
    }
    response()
    nextIdResponse()
    activeConnectionResponse()
  }
  useEffect(() => {
    const response = async () => {
      await ensureCsrf()
      const statsResponse = await fetchWithCsrf("/api/connectionmanager/devicemapping/issued", {
        method: "GET",
      }).then((resp) => resp?.ok ? resp.json() : null)
      .catch((err: Error) => {
        console.error("Failed to fetch issued out device count:", err)

      })
      
      if (statsResponse && statsResponse.deviceCount !== undefined) {
        setDeviceMapping(prev => ({ ...prev, issued_out_number_of_devices: String(statsResponse.deviceCount) }))
      }
    }
    const nextIdResponse = async () => {
      await ensureCsrf()
      const statsResponse = await fetchWithCsrf("/api/connectionmanager/devicemapping/nextid", {
        method: "GET",
      }).then((resp) => resp?.ok ? resp.json() : null)
      .catch((err: Error) => {
        console.error("Failed to fetch next device ID:", err)
      })

      if (statsResponse && statsResponse.deviceId !== undefined) {
        setDeviceMapping(prev => ({ ...prev, next_device_id: String(statsResponse.deviceId) }))
      }
    }
    const activeConnectionResponse = async () => {
      await ensureCsrf()
      const statsResponse = await fetchWithCsrf("/api/connectionmanager/clients", {
        method: "GET",
      }).then((resp) => resp?.ok ? resp.json() : null)
      .catch((err: Error) => {
        console.error("Failed to fetch active connection count:", err)
      })

      if (statsResponse && statsResponse.active !== undefined) {
        setDeviceMapping(prev => ({ ...prev, active_ws_connection: String(statsResponse.active), 
                                              total_ws_connection: String(statsResponse.total) }))
      }
    }
    response()
    nextIdResponse()
    activeConnectionResponse()
  }, [])
  const handleBroadcast = async (action: string) => {
    if(!['device.start', 'device.stop', 'device.restart'].includes(action)) {
      toast("Invalid command action", {
        "theme": "auto",
        "type": "error",
        "position": "top-right",
        "autoClose": 4000
      })
      return
    }
    await ensureCsrf()
    const resp = await fetchWithCsrf("/api/connectionmanager/commands/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          type: "command",
          action: action })
    }).catch((err: Error) => {
      console.error("Failed to send start command:", err)
      toast("Failed to send start command to devices", {
        "theme": "auto",
        "type": "error",
        "position": "top-right",
        "autoClose": 4000,
        })
      })
    if (resp && resp.ok) {
      resp.json().then(data => {
        const { sentCount, totalConnections } = data
        toast(`Start command broadcast successfully. Sent to ${sentCount} devices. Total connections: ${totalConnections}`,
          {
            "theme": "auto",
            "type": "success",
            "position": "top-right",
            "autoClose": 4000,
          }
        )
      }).catch((err: Error) => {
        toast("Command broadcast failed with an error. Error :", {
          "theme": "auto",
          "type": "error",
          "position": "top-right",
          "autoClose": 4000
        })
      })
    }
  }
  const handleNukeTelemetry = async () => {
    if (!confirm("This will permanently delete all telemetry data stored in the database. Are you sure?")) return
    await ensureCsrf()
    const resp = await fetchWithCsrf("/api/connectionmanager/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
    }).then((resp)=> resp.ok? resp.json().then(data => data.deleted): null)
    .catch((err: Error) => {
      console.error("Failed to send start command:", err)
      toast("Failed to delete telemetry data ", {
        "theme": "auto",
        "type": "error",
        "position": "top-right",
        "autoClose": 4000,
        })
    })
    toast(`Deleted ${resp || 0} telemetry records from database`, {
      "theme": "auto",
      "type": "success",
      "position": "top-right",
      "autoClose": 4000,
    })
  }
  const handleClearConnectionManager = async () => {
    if (!confirm("This will permanently delete all connection in Connection Manager. Are you sure?")) return
    await ensureCsrf()
    const resp = await fetchWithCsrf("/api/connectionmanager/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
    }).then((resp)=> resp.ok? resp.json().then(data => data.active): null)
    .catch((err: Error) => {
      console.error("Failed Reset the connection in Command Center", err)
      toast("Failed reset the connection in Command Center ", {
        "theme": "auto",
        "type": "error",
        "position": "top-right",
        "autoClose": 4000,
        })
    })
    toast(`Active ${resp || 0} connections in Command Center are removed`, {
      "theme": "auto",
      "type": "success",
      "position": "top-right",
      "autoClose": 4000,
    })
  }
  const handleRegistry = async () => {
    toast("Create devices in IoT Hub Registry. ", {
      "theme": "auto",
      "type": "warning",
      "position": "top-right",
      "autoClose": 4000,
    })
    await ensureCsrf()
    const resp = await fetchWithCsrf("/api/iothub/device-register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ number_of_devices: 1000 })
    }).then((resp)=> resp.ok? resp.json().then(data => data.count): null)
    .catch((err: Error) => {
      console.error("Failed to send start command:", err)
      toast("Failed to create devices in IoT Hub Registry ", {
        "theme": "auto",
        "type": "error",
        "position": "top-right",
        "autoClose": 4000,
        })
    })
    toast(`Created ${resp || 0} devices in IoT Hub Registry`, {
      "theme": "auto",
      "type": "success",
      "position": "top-right",
      "autoClose": 4000,
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav title="Simulator Control" onRefresh={handleRefresh} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Simulator Environment Settings</h2>
          <p className="text-muted-foreground">
            Configure simulator by Connection Manager functionality, Deliver command to DeviceId, Maintain mapping table.
          </p>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg flex items-center gap-2">
            <Save className="h-5 w-5" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Device Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Device Command 
              </CardTitle>
              <CardDescription>
                Deliver command to device simulator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 md:grid-cols-3 gap-4 items-center justify-start">
                <div className="flex flex-col gap-2">
                  <div>
                    <Label htmlFor="start_all_devices">Start all devices</Label>
                  </div>
                  <div>
                    <Button variant="outline" size="lg" className="ml-2" onClick={() => handleBroadcast('device.start')}>
                        <CirclePlay className="h-5 w-5" />
                      </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div>
                    <Label htmlFor="stop_all_devices">Stop all devices</Label>
                  </div>
                  <div>
                    <Button variant="outline" size="lg" className="ml-2" onClick={() => handleBroadcast('device.stop')}>
                      <CircleStop className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-start gap-2 px-4">
                    <Label htmlFor="restart_all_devices">
                      Restart all
                    </Label>
                  </div>
                  <div>
                    <Button variant="outline" size="lg" className="ml-2" onClick={() => handleBroadcast('device.restart')}>
                      <RefreshCw className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
                <div className="flex flex-col gap-2 mt-4">
                  <Label htmlFor="place_holder">Place holder</Label>

                  <p className="text-xs text-muted-foreground mt-1">
                    Place holder for future use.
                  </p>
                </div>
              </div>
              
            </CardContent>
          </Card>

          {/* DeviceMapping Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Device Mapping table Settings
              </CardTitle>
              <CardDescription>
                Configure device mapping table settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="issued_out_number_of_devices">Issued Out Number of Devices</Label>
                  <Input
                    id="issued_out_number_of_devices"
                    type="text"
                    value={deviceMapping.issued_out_number_of_devices}
                    onChange={(e) =>
                      setDeviceMapping({ ...deviceMapping, issued_out_number_of_devices: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="next_device_id">Next Device ID</Label>
                  <Input
                    id="next_device_id"
                    type="text"
                    value={deviceMapping.next_device_id}
                    onChange={(e) =>
                      setDeviceMapping({ ...deviceMapping, next_device_id: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="active_ws_connection">Active WebSocket Connections</Label>
                  <Input
                    id="active_ws_connection"
                    type="text"
                    value={deviceMapping.active_ws_connection}
                    onChange={(e) =>
                      setDeviceMapping({ ...deviceMapping, active_ws_connection: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="total_ws_connection">Total WebSocket Connections</Label>
                  <Input
                    id="total_ws_connection"
                    type="text"
                    value={deviceMapping.total_ws_connection}
                    onChange={(e) =>
                      setDeviceMapping({ ...deviceMapping, total_ws_connection: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reset_mapping_table">Reset Mapping Table</Label>
                  <div className="flex flex-row items-center justify-content gap-3">
                    <Label htmlFor="num_of_device" className="w-36">
                      Devices #
                    </Label>
                    <Input 
                      id="number_of_devices_to_generate"
                      type="number"
                      defaultValue={1000}
                      style={{ width: "100px" }}
                      onChange={(e) => setDevicesToGenerate(Number(e.target.value))}
                      />
                    <HoverCard openDelay={10} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => handleGenerateDevices(devicesToGenerate)}
                          disabled={generating}>
                          
                          1. Inital mapping table fill-out. 
                          {generating ? 'Generating...' : ' Click to generate'}
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="flex w-64 flex-col gap-0.5">
                        <div className="font-semibold">Mapping table fillout</div>
                        <div>This will fill out the device mapping table with default values.</div>
                        <div>Need to be done before starting device simulator </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          This only needs to be done once.
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  <HoverCard openDelay={10} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <Button variant="outline" onClick={(e) => handleClearMappings()}>
                        2. Reset Mapping table for new simulation project
                      </Button>
                    </HoverCardTrigger>
                      <HoverCardContent className="flex w-64 flex-col gap-0.5">
                        <div className="font-semibold">Mapping table reset</div>
                        <div>This will reset device mapping table. Device ID will be given out starting from 0001</div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          Click with caution.
                        </div>
                      </HoverCardContent>
                  </HoverCard>
                </div>

                  <div className="flex flex-row items-start justify-evenly gap-2 px-1 py-1">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-center ">
                        <Label htmlFor="registry">
                          <span className="whitespace-normal text-center">IoT Registry <br/>Device fillup</span>
                        </Label>
                      </div>
                      <div>
                        <Button variant="outline" size="lg" className="ml-2" onClick={() => handleRegistry()}>
                          <DatabaseBackup className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-center ">
                        <Label htmlFor="nuke_telemetry">
                          <span className="whitespace-normal text-center">Nuke<br/>Telemetry</span>
                        </Label>
                      </div>
                      <div>
                        <Button variant="outline" size="lg" className="ml-2" onClick={() => handleNukeTelemetry()}>
                          <DatabaseBackup className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-center ">
                          <Label htmlFor="clear_connection_manager">
                            <span className="whitespace-normal text-center">Clear Connection<br/> manager memory</span>
                          </Label>
                        </div>
                      <div>
                        <Button variant="outline" size="lg" className="ml-2" onClick={() => handleClearConnectionManager()}>
                          <DatabaseBackup className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
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

          {/* Iot Simulator Control Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Computer className="h-5 w-5" />
                IoT Simulator Control
              </CardTitle>
              <CardDescription>
                AKS IoT Simulator control.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Simulator Status</h4>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">PoD Controller</h4>
                  <p className="text-sm text-muted-foreground">
                    Place holder
                  </p>
                </div>
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

