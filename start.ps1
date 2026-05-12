# Start backend in background
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:DATABASE_URL='postgresql://neondb_owner:npg_YMS7kveH4hga@ep-dawn-heart-aq3atmmb.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'; `$env:PORT=3001; `$env:NODE_ENV='development'; pnpm -r --filter './artifacts/api-server' run start" -PassThru

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend in background  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PORT=5173; `$env:BASE_PATH='/'; pnpm -r --filter './artifacts/media-tracker' run dev"

Write-Host "OtakuVault starting at http://localhost:5173"