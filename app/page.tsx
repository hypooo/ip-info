"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, Globe, MapPin, Copy, Check, Info, X, Building, Shield } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface ProxyTestResult {
  id: number
  url: string
  ip?: string
  country?: string
  status: "loading" | "success" | "error"
  error?: string
  responseTime?: number
}

interface IpDetails {
  ip: string
  city?: string
  region?: string
  country?: string
  country_name?: string
  continent_code?: string
  timezone?: string
  as?: string
  asname?: string
  proxy?: boolean
  is_datacenter?: boolean
  is_known_attacker?: boolean
  is_known_abuser?: boolean
  status?: string
  lat?: number
  lon?: number
}

const TEST_URLS = [
  "https://ptest-1.ipcheck.ing/cdn-cgi/trace",
  "https://ptest-2.ipcheck.ing/cdn-cgi/trace",
  "https://ptest-3.ipcheck.ing/cdn-cgi/trace",
  "https://ptest-4.ipcheck.ing/cdn-cgi/trace",
  "https://ptest-5.ipcheck.ing/cdn-cgi/trace",
  "https://ptest-6.ipcheck.ing/cdn-cgi/trace",
  "https://ptest-7.ipcheck.ing/cdn-cgi/trace",
  "https://ptest-8.ipcheck.ing/cdn-cgi/trace",
]

const COUNTRY_NAMES: Record<string, string> = {
  CN: "中国",
  US: "美国",
  JP: "日本",
  SG: "新加坡",
  HK: "香港",
  TW: "台湾",
  KR: "韩国",
  GB: "英国",
  DE: "德国",
  FR: "法国",
  CA: "加拿大",
  AU: "澳大利亚",
}

const CountryFlag = ({ countryCode }: { countryCode: string }) => {
  return (
    <span
      className={`fi fi-${countryCode.toLowerCase()} inline-block w-4 h-3 rounded-xs`}
      style={{
        backgroundImage: `url("https://flagcdn.com/w2560/${countryCode.toLowerCase()}.png")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  )
}

export default function ProxyTestPage() {
  const [results, setResults] = useState<ProxyTestResult[]>([])
  const [isTestingAll, setIsTestingAll] = useState(false)
  const [copiedIp, setCopiedIp] = useState<string | null>(null)
  const [selectedIp, setSelectedIp] = useState<string | null>(null)
  const [ipDetails, setIpDetails] = useState<IpDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  useEffect(() => {
    const initialResults = TEST_URLS.map((url, index) => ({
      id: index + 1,
      url,
      status: "loading" as const,
    }))
    setResults(initialResults)

    testAllUrls()
  }, [])

  const copyToClipboard = async (ip: string) => {
    try {
      await navigator.clipboard.writeText(ip)
      setCopiedIp(ip)
      setTimeout(() => setCopiedIp(null), 2000)
    } catch (err) {
      console.error("复制失败:", err)
    }
  }

  const parseTraceResponse = (text: string) => {
    const lines = text.split("\n")
    const data: Record<string, string> = {}

    lines.forEach((line) => {
      const [key, value] = line.split("=")
      if (key && value) {
        data[key.trim()] = value.trim()
      }
    })

    return {
      ip: data.ip,
      country: data.loc,
    }
  }

  const testSingleUrl = async (index: number) => {
    const startTime = Date.now()

    setResults((prev) => prev.map((result, i) => (i === index ? { ...result, status: "loading" } : result)))

    try {
      const response = await fetch(TEST_URLS[index], {
        method: "GET",
        cache: "no-cache",
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const text = await response.text()
      const { ip, country } = parseTraceResponse(text)
      const responseTime = Date.now() - startTime

      setResults((prev) =>
        prev.map((result, i) =>
          i === index
            ? {
                ...result,
                ip,
                country,
                status: "success",
                responseTime,
                error: undefined,
              }
            : result,
        ),
      )
    } catch (error) {
      const responseTime = Date.now() - startTime
      setResults((prev) =>
        prev.map((result, i) =>
          i === index
            ? {
                ...result,
                status: "error",
                error: error instanceof Error ? error.message : "请求失败",
                responseTime,
              }
            : result,
        ),
      )
    }
  }

  const testAllUrls = async () => {
    setIsTestingAll(true)

    setResults((prev) =>
      prev.map((result) => ({
        ...result,
        status: "loading",
        error: undefined,
      })),
    )

    const promises = TEST_URLS.map((_, index) => testSingleUrl(index))
    await Promise.all(promises)

    setIsTestingAll(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      case "loading":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const openIpDetails = async (ip: string) => {
    setSelectedIp(ip)
    setIsLoadingDetails(true)
    setIpDetails(null)

    try {
      const response = await fetch(`https://ip.vbr.me/${ip}`)

      if (!response.ok) {
        throw new Error("Failed to fetch IP details")
      }

      const data = await response.json()

      setIpDetails({
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country_code,
        country_name: data.country_name,
        continent_code: data.continent_code,
        timezone: data.time_zone?.name,
        as: data.asn?.asn,
        asname: data.asn?.name,
        proxy: data.threat?.is_proxy,
        is_datacenter: data.threat?.is_datacenter,
        is_known_attacker: data.threat?.is_known_attacker,
        is_known_abuser: data.threat?.is_known_abuser,
        lat: data.latitude,
        lon: data.longitude,
      })
    } catch (error) {
      console.error("Error fetching IP details:", error)
      setIpDetails(null)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const closeIpDetails = () => {
    setSelectedIp(null)
    setIpDetails(null)
  }

  const openIplarkModal = (ip: string) => {
    const width = 1000
    const height = 1040
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2
    window.open(
      `https://iplark.com/${ip}`,
      "_blank",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">代理分流测试</h1>
          <p className="text-muted-foreground mb-6">测试代理软件基于域名的分流规则是否正确配置</p>
          <Button
            onClick={testAllUrls}
            disabled={isTestingAll}
            size="lg"
            className="mb-4 transition-all duration-200 cursor-pointer"
          >
            {isTestingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                重新测试所有节点
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {results.map((result, index) => (
            <Card key={result.id} className="relative min-h-[280px] flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">节点 {result.id}</CardTitle>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(result.status)}`} />
                </div>
                <CardDescription className="text-xs break-all">
                  {result.url.replace("https://", "").replace("/cdn-cgi/trace", "")}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 flex-1 flex flex-col">
                {result.status === "loading" && (
                  <div className="flex items-center justify-center flex-1">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {result.status === "success" && (
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span
                          className="text-sm font-mono cursor-pointer hover:text-primary hover:underline transition-colors"
                          onClick={() => result.ip && openIplarkModal(result.ip)}
                          title="在弹窗中查看 iplark.com 详情"
                        >
                          {result.ip}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => result.ip && openIpDetails(result.ip)}
                          title="查看IP详情"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => result.ip && copyToClipboard(result.ip)}
                          title="复制IP"
                        >
                          {copiedIp === result.ip ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="flex items-center space-x-2">
                        {result.country && <CountryFlag countryCode={result.country} />}
                        <span>{COUNTRY_NAMES[result.country || ""] || result.country || "未知"}</span>
                      </Badge>
                    </div>

                    {result.responseTime && (
                      <div className="text-xs text-muted-foreground">响应时间: {result.responseTime}ms</div>
                    )}
                  </div>
                )}

                {result.status === "error" && (
                  <div className="space-y-3 flex-1">
                    <div className="text-sm text-destructive">❌ 信息获取失败</div>
                    {result.responseTime && (
                      <div className="text-xs text-muted-foreground">耗时: {result.responseTime}ms</div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testSingleUrl(index)}
                  disabled={result.status === "loading"}
                  className="w-full hover:bg-accent hover:text-accent-foreground hover:border-primary/50 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed mt-auto"
                >
                  {result.status === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : "重新测试"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedIp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in-0 duration-200"
          onClick={closeIpDetails}
        >
          <div
            className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">IP 详情: {selectedIp}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeIpDetails}
                className="h-8 w-8 p-0 hover:bg-accent transition-colors duration-150"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">正在获取IP详情...</span>
                </div>
              ) : ipDetails ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <Globe className="h-4 w-4 mr-2" />
                          基本信息
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">IP地址:</span>
                          <span className="text-sm font-mono">{ipDetails.ip}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">国家:</span>
                          <span className="text-sm">{ipDetails.country_name || ipDetails.country}</span>
                        </div>
                        {ipDetails.region && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">地区:</span>
                            <span className="text-sm">{ipDetails.region}</span>
                          </div>
                        )}
                        {ipDetails.city && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">城市:</span>
                            <span className="text-sm">{ipDetails.city}</span>
                          </div>
                        )}
                        {ipDetails.timezone && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">时区:</span>
                            <span className="text-sm">{ipDetails.timezone}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <Building className="h-4 w-4 mr-2" />
                          网络信息
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {ipDetails.as && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">AS号:</span>
                            <span className="text-sm font-mono">{ipDetails.as}</span>
                          </div>
                        )}
                        {ipDetails.asname && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">AS名称:</span>
                            <span className="text-sm">{ipDetails.asname}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Security Info */}
                  {(ipDetails.proxy !== undefined ||
                    ipDetails.is_datacenter !== undefined ||
                    ipDetails.is_known_attacker !== undefined ||
                    ipDetails.is_known_abuser !== undefined) && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          安全信息
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {ipDetails.proxy !== undefined && (
                            <Badge
                              variant={ipDetails.proxy ? "default" : "secondary"}
                              className={ipDetails.proxy ? "bg-red-600 text-white hover:bg-red-700" : ""}
                            >
                              {ipDetails.proxy ? "代理服务器" : "非代理"}
                            </Badge>
                          )}
                          {ipDetails.is_datacenter !== undefined && (
                            <Badge variant={ipDetails.is_datacenter ? "outline" : "secondary"}>
                              {ipDetails.is_datacenter ? "数据中心/云服务" : "非数据中心"}
                            </Badge>
                          )}
                          {ipDetails.is_known_attacker !== undefined && (
                            <Badge
                              variant={ipDetails.is_known_attacker ? "default" : "secondary"}
                              className={ipDetails.is_known_attacker ? "bg-red-600 text-white hover:bg-red-700" : ""}
                            >
                              {ipDetails.is_known_attacker ? "已知攻击源" : "非攻击源"}
                            </Badge>
                          )}
                          {ipDetails.is_known_abuser !== undefined && (
                            <Badge
                              variant={ipDetails.is_known_abuser ? "default" : "secondary"}
                              className={ipDetails.is_known_abuser ? "bg-red-600 text-white hover:bg-red-700" : ""}
                            >
                              {ipDetails.is_known_abuser ? "已知滥用源" : "非滥用源"}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Coordinates */}
                  {ipDetails.lat !== undefined && ipDetails.lon !== undefined && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          地理位置
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">纬度:</span>
                            <span className="text-sm font-mono">{ipDetails.lat}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">经度:</span>
                            <span className="text-sm font-mono">{ipDetails.lon}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p>无法获取IP详情信息</p>
                  <p className="text-sm mt-1">请稍后重试</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
