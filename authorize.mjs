import dotenv from "dotenv";
dotenv.config();

import {
  generateCodeChallenge,
  generateCodeVerifier,
} from "./generateCode.mjs";

import open from "open";

import { readFileSync, writeFileSync } from "fs";

import { createServer } from "http";
import { URLSearchParams } from "url";

export async function authorize() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl = new URL(`https://accounts.spotify.com/authorize`);
  const scope = "user-read-private user-read-email user-read-playback-state";
  const redirect_uri = "http://localhost:5000/callback";

  const params = {
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    redirect_uri: redirect_uri,
  };

  authUrl.search = new URLSearchParams(params).toString();
  console.log(`Opening browser ${authUrl}`);
  await open(authUrl.toString());

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      if (req.url.startsWith("/callback")) {
        const url = new URL(req.url, redirect_uri);
        const code = url.searchParams.get("code");

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<h1>Authorization successful! you can close this window.</h1>",
        );
        server.close();

        try {
          const tokenResponse = await fetch(
            "https://accounts.spotify.com/api/token",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirect_uri,
                client_id: process.env.SPOTIFY_CLIENT_ID,
                code_verifier: codeVerifier,
              }),
            },
          );
          const data = await tokenResponse.json();
          if (data.error) return reject(data);

          writeFileSync("./tokens.json", JSON.stringify(data, null, 2));
          console.log("\nToken saved");
          resolve(data);
        } catch (err) {
          reject(err);
        }
      }
    });

    server.listen(5000, () => {
      console.log("Waiting for Spotify redirect");
    });
  });
}

export async function refeshToken() {
  const tokens = JSON.parse(readFileSync("./tokens.json"));
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: process.env.SPOTIFY_CLIENT_ID,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error_description);

  const updated = { ...tokens, ...data };
  writeFileSync("./tokens.json", JSON.stringify(updated, null, 2));
  console.log("Tokens refreshed");
}
