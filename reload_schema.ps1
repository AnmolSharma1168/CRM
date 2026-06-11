$SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvc2Nxc3phaXJqaG5ndWdqanRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTExMzIxOSwiZXhwIjoyMDk2Njg5MjE5fQ.fc0lE9qW1SatXms-AYmKapGvyjK6TxtEOL9keLyB2GA"
$headers = @{
  "apikey" = $SERVICE_KEY
  "Authorization" = "Bearer $SERVICE_KEY"
  "Content-Type" = "application/json"
}

Write-Host "Testing Supabase connection..."

# Test 1: Try to directly query the customers table
try {
  $resp = Invoke-WebRequest -Uri "https://aoscqszairjhngugjjtn.supabase.co/rest/v1/customers?select=id&limit=1" -Method GET -Headers $headers -TimeoutSec 15
  Write-Host "✅ Customers table accessible! Status: $($resp.StatusCode)"
  Write-Host "   Body: $($resp.Content)"
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  $body = $_.ErrorDetails.Message
  Write-Host "❌ Customers query failed: HTTP $statusCode"
  Write-Host "   Body: $body"
}

Write-Host ""
Write-Host "Testing segments table..."
try {
  $resp = Invoke-WebRequest -Uri "https://aoscqszairjhngugjjtn.supabase.co/rest/v1/segments?select=id&limit=1" -Method GET -Headers $headers -TimeoutSec 15
  Write-Host "✅ Segments table accessible! Status: $($resp.StatusCode)"
  Write-Host "   Body: $($resp.Content)"
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  $body = $_.ErrorDetails.Message
  Write-Host "❌ Segments query failed: HTTP $statusCode"
  Write-Host "   Body: $body"
}

Write-Host ""
Write-Host "Testing campaigns table..."
try {
  $resp = Invoke-WebRequest -Uri "https://aoscqszairjhngugjjtn.supabase.co/rest/v1/campaigns?select=id&limit=1" -Method GET -Headers $headers -TimeoutSec 15
  Write-Host "✅ Campaigns table accessible! Status: $($resp.StatusCode)"
  Write-Host "   Body: $($resp.Content)"
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  $body = $_.ErrorDetails.Message
  Write-Host "❌ Campaigns query failed: HTTP $statusCode"
  Write-Host "   Body: $body"
}

Write-Host ""
Write-Host "Testing customer count..."
try {
  $h2 = $headers.Clone()
  $h2["Prefer"] = "count=exact"
  $resp = Invoke-WebRequest -Uri "https://aoscqszairjhngugjjtn.supabase.co/rest/v1/customers?select=*&limit=0" -Method GET -Headers $h2 -TimeoutSec 15
  Write-Host "✅ Count response: $($resp.Headers['Content-Range'])"
} catch {
  Write-Host "❌ Count failed: $($_.ErrorDetails.Message)"
}
