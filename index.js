import fs from "fs";
import { authorize, refeshToken } from "./authorize.mjs";
import { getLyrics, getLyricsByTime } from "./lyrics.js";
import {
  getCurrentlyPlayingPlayerCtl,
  getCurrentlyPlaying,
} from "./nowPlaying.js";
import { sendChatbox } from "./osc.js";
import os from "os";

console.error = () => {};

let lastSongId = null;
let songLyrics = [];

(async () => {
  try {
    // if (!fs.existsSync("./tokens.json")) {
    //   await authorize();
    // }

    setInterval(async () => {
      try {
        //playerctlIntegration();
        //spotifyIntegration();
        windowsIntegration("");
      } catch (err) {
        console.error("loop error: ", err.message);
      }
    }, 3000);
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
})();

// Uses playerctl to recieve media data
async function playerctlIntegration() {
  // pull from playerctl and time it
  const playerctlStartTime = new Date();
  const playerctlNowPlaying = await getCurrentlyPlayingPlayerCtl("spotify");
  const playerctlEndTime = new Date();

  const currentSongId =
    playerctlNowPlaying.title + "-" + playerctlNowPlaying.artist;

  const delay = (playerctlEndTime - playerctlStartTime) / 1000;

  //get lyrics based on current media playback
  var lyricDelay = 0;
  if (currentSongId !== lastSongId) {
    lastSongId = currentSongId;
    var lyricStart = new Date();
    songLyrics = await getLyrics(
      playerctlNowPlaying.title,
      playerctlNowPlaying.artist,
    );
    var lyricEnd = new Date();
    lyricDelay += (lyricEnd - lyricStart) / 1000;
    console.log(`Now playing: ${playerctlNowPlaying.title}`);
  }

  if (playerctlNowPlaying.status === "Playing") {
    var status = true;
  } else {
    var status = false;
  }

  await createOutput(
    playerctlNowPlaying.title,
    playerctlNowPlaying.artist,
    status,
    songLyrics,
    playerctlNowPlaying.position_s,
    playerctlNowPlaying.length_s,
    delay + lyricDelay,
    true,
  );
}

// uses the spotifyapi to recieve media data
async function spotifyIntegration() {
  // pull from api and time request
  const spotifyStartTime = new Date();
  const spotifyNowPlaying = await getCurrentlyPlaying();
  const spotifyEndTime = new Date();
  const delay = (spotifyEndTime - spotifyStartTime) / 1000;

  if (!spotifyNowPlaying || !spotifyNowPlaying.item) return;

  const currentSongId = spotifyNowPlaying.item.id;
  const currentTime = spotifyNowPlaying.progress_ms / 1000;

  // get lyrics based on media playback
  var lyricDelay = 0;
  if (currentSongId !== lastSongId) {
    lastSongId = currentSongId;
    var lyricStart = new Date();
    songLyrics = await getLyrics(
      spotifyNowPlaying.item.name,
      spotifyNowPlaying.item.artists[0].name,
    );
    var lyricEnd = new Date();
    lyricDelay += (lyricEnd - lyricStart) / 1000;
    console.log(`Now playing: ${spotifyNowPlaying.item.name}`);
  }

  createOutput(
    spotifyNowPlaying.item.name,
    spotifyNowPlaying.item.artists[0].name,
    spotifyNowPlaying.is_playing,
    songLyrics,
    currentTime,
    spotifyNowPlaying.item.duration_ms / 1000,
    delay + lyricDelay,
    true,
  );
}

// uses windows runtime api to recieve data
async function windowsIntegration(player) {
  //import and get media
  const startDelay = new Date();
  const { SMTCMonitor } = await import("@coooookies/windows-smtc-monitor");
  const session = SMTCMonitor.getCurrentMediaSession();
  // if (player !== "") {
  //   var session = SMTCMonitor.getCurrentMediaSession();
  // } else {
  //   var session = SMTCMonitor.getMediaSessionByAppId(player);
  // }
  const endDelay = new Date();

  const delay = (endDelay - startDelay) / 1000;

  const currentSongId = session.media.title + "-" + session.media.artist;

  // get lyrics based on playback
  var lyricDelay = 0;
  if (currentSongId !== lastSongId) {
    lastSongId = currentSongId;
    var lyricStart = new Date();
    songLyrics = await getLyrics(session.media.title, session.media.artist);
    var lyricEnd = new Date();
    lyricDelay += (lyricEnd - lyricStart) / 1000;
    console.log(`Now playing: ${session.media.title}`);
  }

  if (session.playback.playbackStatus == 4) {
    var status = true;
  } else {
    var status = false;
  }

  createOutput(
    session.media.title,
    session.media.artist,
    status,
    songLyrics,
    session.timeline.position,
    session.timeline.duration,
    lyricDelay + delay,
    true,
  );
}

async function createOutput(
  title,
  artist,
  status,
  lyrics,
  currentTime,
  length,
  offset,
  osc,
) {
  if (status == true) {
    const currentLyrics = await getLyricsByTime(
      lyrics,
      currentTime + offset,
      5,
    );

    if (currentLyrics.length) {
      const lyricString = ` 🎤 -${currentLyrics}`;

      console.log(lyricString + "\n");
      osc ? sendChatbox(lyricString, 0) : null;
    } else {
      const currentMinute = Math.floor(currentTime / 60);
      var currentSec = parseInt(currentTime % 60);
      const endMinute = Math.floor(length / 60);
      var endSec = parseInt(length % 60);

      if (currentSec < 10) {
        currentSec = "0" + currentSec.toString();
      }
      if (endSec < 10) {
        endSec = "0" + endSec.toString();
      }

      const noLyricString = ` 🎶 ${title} - ${artist}\n ${currentMinute}:${currentSec}|${endMinute}:${endSec}`;

      console.log(noLyricString + "\n");
      osc ? sendChatbox(noLyricString, 0) : null;
    }
  } else {
    const pausedString = " ⏸️";
    console.log(pausedString + "\n");
    osc ? sendChatbox(pausedString, 0) : null;
  }
}
