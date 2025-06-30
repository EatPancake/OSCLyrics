import { Client, NotFoundError } from "lrclib-api";

export async function getLyrics(songName, artistName) {
  const client = new Client();
  const query = {
    track_name: songName,
    artist_name: artistName,
  };

  try {
    const syncedLyrics = await client.getSynced(query);
    return syncedLyrics;
  } catch (err) {
    if (err instanceof NotFoundError) {
      print("err");
    }
    console.log("Could not find lyrics: ", err);
    return null;
  }
}

export async function getLyricsByTime(lyrics, currentTime, time) {
  if (lyrics == null) {
    return "";
  }

  const endTime = currentTime + time;
  var startOffset = 0.5;
  var currentLyric = -1;

  for (const line of lyrics) {
    currentLyric++;
    if (line.startTime >= currentTime) {
      break;
    }
  }

  var nextTimeDiff;
  if (currentLyric < lyrics.length - 1) {
    nextTimeDiff =
      lyrics[currentLyric + 1].startTime - lyrics[currentLyric].startTime;
  } else {
    nextTimeDiff = -1;
  }
  var currentTimeDiff;
  if (currentLyric >= 1) {
    currentTimeDiff = currentTime - lyrics[currentLyric - 1].startTime;
  } else {
    currentTimeDiff = -1;
  }
  var lyricTimeDiff;
  if (currentLyric >= 1) {
    lyricTimeDiff =
      lyrics[currentLyric].startTime - lyrics[currentLyric - 1].startTime;
  } else {
    lyricTimeDiff = -1;
  }

  if (
    lyricTimeDiff > time - 1.5 &&
    currentTimeDiff < time + 1 &&
    currentLyric >= 1
  ) {
    startOffset += lyricTimeDiff - (nextTimeDiff - currentTimeDiff);
    //return lyrics[currentLyric - 1].text + "\n";
  } else if (currentTimeDiff < 1.5 && currentLyric >= 1) {
    startOffset += lyricTimeDiff;
  }
  return lyrics
    .filter(
      (line) =>
        line.startTime >= currentTime - startOffset &&
        line.startTime <= endTime,
    )
    .map((line) => line.text)
    .join("\n");
}
