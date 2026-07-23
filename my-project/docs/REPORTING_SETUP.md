# Reporterias automaticas

La aplicación expone `POST /api/internal/reports/daily`. Requiere:

```text
Authorization: Bearer $REPORTS_CRON_SECRET
```

La ruta solo ejecuta envíos a las 08:00 en `America/Santiago`; las demás invocaciones horarias responden `skipped`. El job se ejecuta cada hora para conservar el horario correcto cuando Chile cambia entre horario de invierno y verano.

## Variables de entorno

Configurar en el despliegue:

```text
REPORTS_CRON_SECRET=<secreto largo y aleatorio>
REPORT_TEST_RECIPIENT=dsoler.olguin@gmail.com
```

## Supabase Cron

Activar `pg_cron` y `pg_net` en Supabase y crear un job horario. Se recomienda guardar la URL y el secreto en Vault o en secretos administrados, no en el repositorio. Primero registra el mismo secreto que configuraste en el despliegue (el valor no debe quedar en Git):

```sql
select vault.create_secret('<REPORTS_CRON_SECRET>', 'reports_cron_secret');
```

Luego crea o reemplaza el job:

```sql
select cron.unschedule(jobid)
from cron.job
where jobname = 'qualiblick-reportes-horario';

select cron.schedule(
  'qualiblick-reportes-horario',
  '0 * * * *',
  $$
  select net.http_post(
    url := '<NEXT_PUBLIC_APP_URL>/api/internal/reports/daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'reports_cron_secret'
        limit 1
      )
    ),
    body := '{}'::jsonb
  )
  $$
);
```

El endpoint es idempotente mediante `report_delivery`; una repetición del job no duplica un correo ya enviado y los fallos quedan disponibles para reintento.

El job no debe apuntar a `localhost`: usa la URL pública del despliegue que ya incluya esta ruta y configura `REPORTS_CRON_SECRET` con el mismo valor en ese despliegue y en Vault. Después del despliegue, se puede comprobar la activación con:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'qualiblick-reportes-horario';
```

## Prueba manual

Con la misma autorización se puede invocar:

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/internal/reports/test" \
  -H "Authorization: Bearer $REPORTS_CRON_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{"recipient":"dsoler.olguin@gmail.com","serviceName":"Planting Stock Pelú"}'
```
