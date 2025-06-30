import { readFileSync, writeFileSync } from "fs";

import { refeshToken } from "./authorize.mjs";

import { exec } from "child_process";

import { resolve } from "path";

import { promisify } from "util";

const execPromise = promisify(exec);

export async function getCurrentlyPlaying() {
  const tokens = JSON.parse(readFileSync("./tokens.json", "utf8"));

  const url = "https://api.spotify.com/v1/me/player/currently-playing";
  var response = await fetch(url, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (response.status == 401) {
    console.log("Token Expired Refeshing");
    await refeshToken();
  }

  response = await response.json();
  return response;
}

export async function getCurrentlyPlayingPlayerCtl(player) {
  var playerFlag = "--player=";
  if (player != "") {
    playerFlag += player;
  }

  try {
    const { stdout: title } = await execPromise(
      `playerctl ${playerFlag} metadata title`,
    );

    const { stdout: artist } = await execPromise(
      `playerctl ${playerFlag} metadata artist`,
    );

    const { stdout: position_s } = await execPromise(
      `playerctl ${playerFlag} position`,
    );

    const { stdout: length_us } = await execPromise(
      `playerctl ${playerFlag} metadata mpris:length`,
    );

    const length_s = length_us / 1000000;

    const { stdout: status } = await execPromise(
      `playerctl ${playerFlag} status`,
    );

    return {
      title: title.trim(),
      artist: artist.trim(),
      position_s: parseFloat(position_s),
      length_s: length_s,
      status: status.trim(),
    };
  } catch (err) {
    console.error(err);
  }
}
