import { neon } from '@neondatabase/serverless';

function getDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error('Database connection string is missing.');
  }
  return neon(dbUrl);
}

let tableEnsured = false;
async function ensureTable(sql) {
  if (tableEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS chords_services (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT,
        location TEXT,
        type TEXT,
        notes TEXT,
        song_ids JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    tableEnsured = true;
  } catch (e) {
    console.error('Error creating chords_services table:', e);
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = getDb();
    await ensureTable(sql);

    if (req.method === 'GET' || req.method === 'HEAD') {
      const rows = await sql`
        SELECT id, title, date, location, type, notes, song_ids,
               EXTRACT(EPOCH FROM created_at) * 1000 AS created_at,
               EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at
        FROM chords_services
        ORDER BY updated_at DESC
      `;

      const services = rows.map(r => ({
        id: r.id,
        title: r.title,
        date: r.date || '',
        location: r.location || '',
        type: r.type || 'servicio',
        notes: r.notes || '',
        songIds: Array.isArray(r.song_ids) ? r.song_ids : [],
        createdAt: Number(r.created_at || Date.now()),
        updatedAt: Number(r.updated_at || Date.now())
      }));

      return res.status(200).json({ success: true, services });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { services, service } = body || {};

      if (Array.isArray(services)) {
        for (const s of services) {
          await sql`
            INSERT INTO chords_services (id, title, date, location, type, notes, song_ids, updated_at)
            VALUES (
              ${s.id},
              ${s.title},
              ${s.date || null},
              ${s.location || null},
              ${s.type || 'servicio'},
              ${s.notes || null},
              ${JSON.stringify(s.songIds || [])}::jsonb,
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              date = EXCLUDED.date,
              location = EXCLUDED.location,
              type = EXCLUDED.type,
              notes = EXCLUDED.notes,
              song_ids = EXCLUDED.song_ids,
              updated_at = NOW();
          `;
        }
        return res.status(200).json({ success: true, count: services.length });
      }

      if (service && service.id) {
        await sql`
          INSERT INTO chords_services (id, title, date, location, type, notes, song_ids, updated_at)
          VALUES (
            ${service.id},
            ${service.title},
            ${service.date || null},
            ${service.location || null},
            ${service.type || 'servicio'},
            ${service.notes || null},
            ${JSON.stringify(service.songIds || [])}::jsonb,
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            date = EXCLUDED.date,
            location = EXCLUDED.location,
            type = EXCLUDED.type,
            notes = EXCLUDED.notes,
            song_ids = EXCLUDED.song_ids,
            updated_at = NOW();
        `;
        return res.status(200).json({ success: true, serviceId: service.id });
      }

      return res.status(400).json({ error: 'Falta objeto service o services' });
    }

    if (req.method === 'DELETE') {
      let id = req.query?.id;

      if (!id && req.url) {
        try {
          const url = new URL(req.url, 'http://localhost');
          id = url.searchParams.get('id');
        } catch {}
      }

      if (!id && req.body) {
        try {
          const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          id = parsed?.id;
        } catch {}
      }

      if (!id) {
        return res.status(400).json({ error: 'Falta id de servicio' });
      }

      await sql`
        DELETE FROM chords_services 
        WHERE id = ${id}
      `;

      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('API Services Error:', error);
    return res.status(500).json({ error: error.message || 'Error en servidor' });
  }
}
