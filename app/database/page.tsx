"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminNav } from "@/components/admin-nav"
import { Database, Table2, Clock, HardDrive } from "lucide-react"

type CollectionStat = {
  model: string
  collection: string
  count: number
  sizeKb: number
  storageSizeKb: number
  avgObjSizeBytes: number
}

type DbStats = {
  name: string
  collections: number
  objects: number
  dataSizeKb: number
  storageSizeKb: number
  indexSizeKb: number
  avgObjSizeBytes: number
}

type DatabaseData = {
  database: DbStats
  collections: CollectionStat[]
  counts: Record<string, number>
  timestamp: string
}

function formatKb(kb: number): string {
  if (kb >= 1048576) return `${(kb / 1048576).toFixed(1)} GB`
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb.toFixed(1)} KB`
}

export default function DatabasePage() {
  const [data, setData] = useState<DatabaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/database')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: DatabaseData = await res.json()
      setData(json)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch database stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="min-h-screen bg-background">
      <AdminNav title="Database" onRefresh={fetchData} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Database Overview</h2>
            <p className="text-muted-foreground">
              Azure Cosmos DB for MongoDB — collection stats and document counts
            </p>
          </div>
          {lastRefresh && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 mb-6 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-4 bg-muted rounded w-1/2" /></CardHeader>
                <CardContent><div className="h-8 bg-muted rounded w-3/4" /></CardContent>
              </Card>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Collections</CardTitle>
                  <Table2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.database.collections}</div>
                  <p className="text-xs text-muted-foreground mt-1">in {data.database.name}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.database.objects.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">across all collections</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Size</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatKb(data.database.dataSizeKb)}</div>
                  <p className="text-xs text-muted-foreground mt-1">uncompressed data</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage Size</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatKb(data.database.storageSizeKb)}</div>
                  <p className="text-xs text-muted-foreground mt-1">on-disk (incl. indexes)</p>
                </CardContent>
              </Card>
            </div>

            {/* Document counts quick view */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {Object.entries(data.counts).map(([model, count]) => (
                <Card key={model} className="text-center">
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xl font-bold">{count.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-1">{model}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Per-collection stats table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  Collection Details
                </CardTitle>
                <CardDescription>Storage and document statistics per collection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left pb-2 pr-4">Model</th>
                        <th className="text-left pb-2 pr-4">Collection</th>
                        <th className="text-right pb-2 pr-4">Documents</th>
                        <th className="text-right pb-2 pr-4">Data Size</th>
                        <th className="text-right pb-2 pr-4">Storage Size</th>
                        <th className="text-right pb-2">Avg Doc Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.collections.map((col) => (
                        <tr key={col.collection} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 pr-4 font-medium">{col.model}</td>
                          <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{col.collection}</td>
                          <td className="py-2 pr-4 text-right">{col.count.toLocaleString()}</td>
                          <td className="py-2 pr-4 text-right">{formatKb(col.sizeKb)}</td>
                          <td className="py-2 pr-4 text-right">{formatKb(col.storageSizeKb)}</td>
                          <td className="py-2 text-right">{col.avgObjSizeBytes.toFixed(0)} B</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Note about CPU/Memory/Disk */}
            <Card className="mt-4 border-dashed">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Azure Cosmos DB for MongoDB does not expose server-level CPU, memory, or disk metrics through the MongoDB wire protocol.
                  To view infrastructure metrics such as CPU utilization and storage capacity, please visit the{' '}
                  <a
                    href="https://portal.azure.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-foreground hover:text-primary"
                  >
                    Azure Portal → Cosmos DB → Metrics
                  </a>.
                </p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  )
}
