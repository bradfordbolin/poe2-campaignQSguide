import fs from 'node:fs/promises'
import path from 'node:path'

const APP_ID = 2694490

const steamNewsUrl = new URL('https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/')
steamNewsUrl.searchParams.set('appid', String(APP_ID))
steamNewsUrl.searchParams.set('count', '200')
steamNewsUrl.searchParams.set('maxlength', '1')

const steamPlayersUrl = new URL(
  'https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/',
)
steamPlayersUrl.searchParams.set('appid', String(APP_ID))

const poe2TradeLeaguesUrl = new URL(
  'https://www.pathofexile.com/api/trade2/data/leagues',
)

const poe2ContentUrl = new URL('https://pathofexile2.com/internal-api/content.json')

const poe2LeagueAnnouncementUrl = new URL(
  'https://pathofexile2.com/internal-api/content/league-announcement',
)

const versionRegex = /\b0\.\d+(?:\.\d+){0,2}[a-z]?\b/i

const fetchJson = async (url, { timeoutMs = 20_000 } = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'poe2-campaignQSguide',
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

const main = async () => {
  const [newsJson, playersJson, tradeLeaguesJson, poe2ContentJson, leagueAnnouncementJson] =
    await Promise.all([
    fetchJson(steamNewsUrl),
    fetchJson(steamPlayersUrl),
    fetchJson(poe2TradeLeaguesUrl),
    fetchJson(poe2ContentUrl),
    fetchJson(poe2LeagueAnnouncementUrl),
  ])

  const newsItems = (newsJson?.appnews?.newsitems ?? []).map((item) => ({
    gid: item.gid,
    title: item.title,
    url: item.url,
    date: item.date,
    author: item.author,
    feedlabel: item.feedlabel,
  }))

  const latestVersionItem = newsItems.find((item) => versionRegex.test(item.title))
  const versionMatch = latestVersionItem?.title?.match(versionRegex)?.[0]

  const tradeLeagues = (tradeLeaguesJson?.result ?? [])
    .filter((league) => league && typeof league === 'object')
    .map((league) => ({
      id: String(league.id ?? ''),
      name: String(league.text ?? league.id ?? ''),
      realm: String(league.realm ?? ''),
    }))
    .filter((league) => league.id.length > 0)

  const activeTradeLeague =
    tradeLeagues.find(
      (league) =>
        league.realm === 'poe2' &&
        !/^HC\b/i.test(league.id) &&
        !/^(Standard|Hardcore)$/i.test(league.id),
    ) ?? null

  const countdownDateRaw =
    leagueAnnouncementJson?.components?.['league-announcement']?.props?.countdown
      ?.date ?? null
  const countdownDate =
    typeof countdownDateRaw === 'string' && countdownDateRaw.length > 0
      ? countdownDateRaw
      : null

  const leagueAnnouncementSlugRaw =
    poe2ContentJson?.data?.['league-announcement']?.slug ?? null
  const leagueAnnouncementSlug =
    typeof leagueAnnouncementSlugRaw === 'string' && leagueAnnouncementSlugRaw
      ? leagueAnnouncementSlugRaw
      : null

  const leagueAnnouncementUrl = leagueAnnouncementSlug
    ? `https://pathofexile2.com/${leagueAnnouncementSlug}`
    : 'https://pathofexile2.com/'

  const latestLeague =
    activeTradeLeague && countdownDate
      ? {
          id: activeTradeLeague.id,
          name: activeTradeLeague.name || activeTradeLeague.id,
          url: leagueAnnouncementUrl,
          start_at: countdownDate,
        }
      : null

  const out = {
    generated_at: new Date().toISOString(),
    league: latestLeague,
    steam: {
      appid: APP_ID,
      latest_version: latestVersionItem?.url && versionMatch
        ? {
            version: versionMatch,
            title: latestVersionItem.title,
            url: latestVersionItem.url,
            date: latestVersionItem.date,
          }
        : null,
      current_players:
        typeof playersJson?.response?.player_count === 'number'
          ? {
              player_count: playersJson.response.player_count,
              fetched_at: new Date().toISOString(),
            }
          : null,
      latest_news: newsItems.slice(0, 5),
    },
  }

  const outputPath = path.join(process.cwd(), 'public', 'poe2-game-info.json')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(out, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
