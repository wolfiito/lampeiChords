import { neon } from '@neondatabase/serverless';

function getDb() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error('Database connection string is missing.');
  }
  return neon(dbUrl);
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

    if (req.method === 'GET' || req.method === 'HEAD') {
      const { check, summary } = req.query || {};

      // Fast check endpoint (<10ms query) to detect if songs were updated or deleted
      if (check === '1' || summary === '1') {
        const result = await sql`
          SELECT 
            COALESCE(MAX(EXTRACT(EPOCH FROM updated_at) * 1000), 0) AS max_updated_at,
            COUNT(*)::int AS count
          FROM chords_songs
        `;
        const row = result[0] || {};
        return res.status(200).json({
          success: true,
          maxUpdatedAt: Number(row.max_updated_at || 0),
          count: Number(row.count || 0)
        });
      }

      const rows = await sql`
        SELECT id, title, artist, original_key, current_key, capo, tempo, tags, content,
               EXTRACT(EPOCH FROM created_at) * 1000 AS created_at,
               EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at
        FROM chords_songs
        ORDER BY updated_at DESC
      `;

      const songs = rows.map(r => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        originalKey: r.original_key,
        currentKey: r.current_key,
        capo: Number(r.capo || 0),
        tempo: r.tempo ? Number(r.tempo) : undefined,
        tags: Array.isArray(r.tags) ? r.tags : [],
        content: r.content,
        createdAt: Number(r.created_at || Date.now()),
        updatedAt: Number(r.updated_at || Date.now())
      }));

      return res.status(200).json({ success: true, songs });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { songs, song } = body || {};

      if (Array.isArray(songs)) {
        for (const s of songs) {
          await sql`
            INSERT INTO chords_songs (id, title, artist, original_key, current_key, capo, tempo, tags, content, updated_at)
            VALUES (
              ${s.id},
              ${s.title},
              ${s.artist || ''},
              ${s.originalKey || 'C'},
              ${s.currentKey || s.originalKey || 'C'},
              ${s.capo || 0},
              ${s.tempo || null},
              ${JSON.stringify(s.tags || [])}::jsonb,
              ${s.content || ''},
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              artist = EXCLUDED.artist,
              original_key = EXCLUDED.original_key,
              current_key = EXCLUDED.current_key,
              capo = EXCLUDED.capo,
              tempo = EXCLUDED.tempo,
              tags = EXCLUDED.tags,
              content = EXCLUDED.content,
              updated_at = NOW();
          `;
        }
        return res.status(200).json({ success: true, count: songs.length });
      }

      if (song && song.id) {
        await sql`
          INSERT INTO chords_songs (id, title, artist, original_key, current_key, capo, tempo, tags, content, updated_at)
          VALUES (
            ${song.id},
            ${song.title},
            ${song.artist || ''},
            ${song.originalKey || 'C'},
            ${song.currentKey || song.originalKey || 'C'},
            ${song.capo || 0},
            ${song.tempo || null},
            ${JSON.stringify(song.tags || [])}::jsonb,
            ${song.content || ''},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            artist = EXCLUDED.artist,
            original_key = EXCLUDED.original_key,
            current_key = EXCLUDED.current_key,
            capo = EXCLUDED.capo,
            tempo = EXCLUDED.tempo,
            tags = EXCLUDED.tags,
            content = EXCLUDED.content,
            updated_at = NOW();
        `;
        return res.status(200).json({ success: true, songId: song.id });
      }

      return res.status(400).json({ error: 'Falta objeto song o songs' });
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
        return res.status(400).json({ error: 'Falta id de canción' });
      }

      // Delete by exact id or decoded id
      const decodedId = decodeURIComponent(id);
      await sql`
        DELETE FROM chords_songs 
        WHERE id = ${id} OR id = ${decodedId}
      `;

      return res.status(200).json({ success: true, deletedId: id });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Error en servidor' });
  }
}
