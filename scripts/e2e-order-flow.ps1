# End-to-end order flow verification.
# Prerequisites: infrastructure (docker compose up -d) and all services running.
# Exercises: product creation -> stock provisioning -> happy path saga ->
#            payment-failure compensation -> insufficient-stock rejection.
$ErrorActionPreference = 'Stop'
$gateway = 'http://localhost:5000'
$inventory = 'http://localhost:5006'

function Wait-OrderFinal($orderId, $headers) {
    for ($i = 0; $i -lt 30; $i++) {
        $order = Invoke-RestMethod "$gateway/api/orders/$orderId" -Headers $headers
        if ($order.status -ne 'Pending') { return $order }
        Start-Sleep -Seconds 2
    }
    throw "Order $orderId did not reach a final state in time"
}

function Assert($condition, $message) {
    if (-not $condition) { throw "ASSERT FAILED: $message" }
    Write-Host "  OK: $message" -ForegroundColor Green
}

Write-Host "== Login" -ForegroundColor Cyan
$admin = Invoke-RestMethod "$gateway/api/auth/login" -Method Post -ContentType 'application/json' `
    -Body '{"email":"admin@ecommerce.dev","password":"Admin123!"}'
# only the admin account is seeded; register the customer on first run (fresh db)
try {
    $user = Invoke-RestMethod "$gateway/api/auth/login" -Method Post -ContentType 'application/json' `
        -Body '{"email":"test@example.com","password":"Test1234!"}'
} catch {
    Invoke-RestMethod "$gateway/api/auth/register" -Method Post -ContentType 'application/json' `
        -Body '{"email":"test@example.com","password":"Test1234!","firstName":"Test","lastName":"User"}' | Out-Null
    $user = Invoke-RestMethod "$gateway/api/auth/login" -Method Post -ContentType 'application/json' `
        -Body '{"email":"test@example.com","password":"Test1234!"}'
}
$adminHeaders = @{ Authorization = "Bearer $($admin.accessToken)" }
$userHeaders = @{ Authorization = "Bearer $($user.accessToken)" }

Write-Host "== Create product (feeds Search index + Inventory stock via events)" -ForegroundColor Cyan
$category = (Invoke-RestMethod "$gateway/api/categories")[0]
$product = Invoke-RestMethod "$gateway/api/products" -Method Post -Headers $adminHeaders -ContentType 'application/json' -Body (@{
    name = "E2E Test Product $(Get-Date -Format HHmmss)"
    description = 'Created by e2e-order-flow.ps1'
    price = 49.99
    categoryId = $category.id
} | ConvertTo-Json)
Start-Sleep -Seconds 5

$stock = Invoke-RestMethod "$inventory/api/inventory/$($product.id)"
Assert ($stock.availableQuantity -eq 100) "initial stock is 100"

function New-Order($cardNumber, $quantity) {
    Invoke-RestMethod "$gateway/api/orders" -Method Post -Headers $userHeaders -ContentType 'application/json' -Body (@{
        items = @(@{ productId = $product.id; productName = $product.name; unitPrice = 49.99; quantity = $quantity })
        shippingAddress = 'Ataturk Cad. No:1 Istanbul'
        cardNumber = $cardNumber
    } | ConvertTo-Json -Depth 5)
}

Write-Host "== Scenario 1: happy path" -ForegroundColor Cyan
$order = Wait-OrderFinal (New-Order '4111111111111111' 2).id $userHeaders
Assert ($order.status -eq 'Confirmed') "order confirmed"
$stock = Invoke-RestMethod "$inventory/api/inventory/$($product.id)"
Assert ($stock.availableQuantity -eq 98) "stock reduced to 98"

Write-Host "== Scenario 2: payment failure -> compensation" -ForegroundColor Cyan
$order = Wait-OrderFinal (New-Order '4000000000000002' 3).id $userHeaders
Assert ($order.status -eq 'Cancelled') "order cancelled"
Assert ($order.cancellationReason -like '*declined*') "reason mentions declined card"
Start-Sleep -Seconds 3
$stock = Invoke-RestMethod "$inventory/api/inventory/$($product.id)"
Assert ($stock.availableQuantity -eq 98) "reserved stock released back to 98"

Write-Host "== Scenario 3: insufficient stock" -ForegroundColor Cyan
$order = Wait-OrderFinal (New-Order '4111111111111111' 500).id $userHeaders
Assert ($order.status -eq 'Cancelled') "order cancelled"
Assert ($order.cancellationReason -like '*Insufficient stock*') "reason mentions insufficient stock"
$stock = Invoke-RestMethod "$inventory/api/inventory/$($product.id)"
Assert ($stock.availableQuantity -eq 98) "stock untouched at 98"

Write-Host "`nALL E2E SCENARIOS PASSED" -ForegroundColor Green
