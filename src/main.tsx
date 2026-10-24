import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { socket, request, RequestError } from "./connection";
import {
  getSession,
  saveSession,
  clearSession,
  releaseSession,
  readDraft,
  writeDraft,
  type Session,
} from "./session";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  Copy,
  Crown,
  Download,
  Feather,
  Gamepad2,
  Link,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Plus,
  Radio,
  RotateCcw,
  Send,
  Share2,
  Shuffle,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { Room, Player, Panel } from "./types";
import { download, storyImage } from "./export";
import "./styles.css";

const genres = ["Comedy", "Horror", "Mystery", "Fantasy", "Sci-Fi", "Random"];
const genreIcons = ["😂", "👻", "🔍", "🐉", "🛸", "🎲"];
const twists = [
  "Introduce a villain with a very ordinary problem.",
  "Reveal that someone has been lying all along.",
  "Add a talking animal with terrible advice.",
  "Change the setting in the most unexpected way.",
  "Let a tiny secret cause a huge problem.",
  "Make the situation completely ridiculous.",
  "Introduce a mysterious object that should not exist.",
  "Have the least likely character betray everyone.",
  "Give someone an inconvenient superpower.",
  "Make the solution worse than the problem.",
];
const colors = ["violet", "yellow", "mint", "coral"];
function Avatar({
  player,
  index = 0,
  small = false,
}: {
  player?: Pick<Player, "nickname">;
  index?: number;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar ${colors[index % 4]} ${small ? "small" : ""}`}
      aria-label={player?.nickname}
    >
      {player
        ? player.nickname.slice(0, 2).toUpperCase()
        : ["✦", "☻", "✿", "★"][index % 4]}
    </span>
  );
}
function Logo() {
  return (
    <span className="logo">
      <span className="logo-icon">
        <MessageCircle size={26} fill="currentColor" />
        <Zap size={15} className="logo-zap" fill="currentColor" />
      </span>
      Plot<span>Relay</span>
      <span className="beta">BETA</span>
    </span>
  );
}
function Comic({ panel, index }: { panel: Panel; index: number }) {
  return (
    <motion.article
      className={`comic-panel ${colors[index % 4]}`}
      initial={{ opacity: 0, y: 25, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", damping: 18 }}
    >
      <div className="panel-top">
        <span>PANEL {String(index + 1).padStart(2, "0")}</span>
        <Sparkles size={20} />
      </div>
      <div className="speech">{panel.text}</div>
      <div className="panel-author">
        <Avatar player={{ nickname: panel.author }} index={index} small />
        <span>
          Written by <b>{panel.author}</b>
        </span>
      </div>
    </motion.article>
  );
}
function Landing({ navigate }: { navigate: (page: string) => void }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> YOUR NEXT GAME NIGHT STARTS HERE
          </div>
          <h1>
            One story.
            <br />
            Many minds.
            <br />
            <span>Total chaos.</span>
            <svg className="scribble" viewBox="0 0 360 18">
              <path d="M3 12Q140-3 355 8M45 17Q190 6 320 14" />
            </svg>
          </h1>
          <p className="hero-description">
            A storytelling game where you write the next twist.
            <br className="desktop" /> Pass it on. Keep it secret. Watch it get
            wonderfully weird.
          </p>
          <div className="hero-buttons">
            <button
              className="button primary"
              onClick={() => navigate("create")}
            >
              <Plus size={19} /> Create a room <ArrowUpRight size={19} />
            </button>
            <button
              className="button secondary"
              onClick={() => navigate("join")}
            >
              Join a room <ArrowRight size={18} />
            </button>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              {[0, 1, 2, 3].map((i) => (
                <Avatar key={i} index={i} small />
              ))}
            </div>
            <span>
              2–8 friends <i /> No sign-ups <i /> Just imagination
            </span>
          </div>
        </div>
        <div
          className="hero-art"
          aria-label="Example story: an ordinary cat becomes the unexpected ruler of Earth"
        >
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="floating-star star-one">✦</span>
          <span className="floating-star star-two">✧</span>
          <span className="art-label">
            <Zap size={14} fill="currentColor" /> ZERO PLANS. INFINITE PLOT
            TWISTS.
          </span>
          <div className="art-card back">
            <span className="comic-tag">THE BEGINNING</span>
            <p>“It was a perfectly ordinary Tuesday. Until the cat spoke.”</p>
            <div className="mini-author">
              <span>☻</span> Alex started something...
            </div>
          </div>
          <div className="art-card middle">
            <span className="comic-tag">THE PLOT THICKENS</span>
            <div className="cat-scene">
              <span className="planet" />
              <div className="cat">
                <div className="ear left" />
                <div className="ear right" />
                <div className="cat-face">
                  <span className="cat-eyes">• •</span>
                  <span className="cat-mouth">ω</span>
                </div>
                <span className="cat-crown">♛</span>
              </div>
              <div className="cat-bubble">
                “Take me to
                <br />
                your leader.”
              </div>
              <span className="scene-spark">✧</span>
            </div>
            <p>“Turns out, Mr. Whiskers had been running Earth all along.”</p>
            <div className="mini-author">
              <span>✿</span> Sam made it weird.
            </div>
          </div>
          <div className="art-card front">
            <div className="next-icon">
              <Feather size={23} />
            </div>
            <div>
              <span>AND THEN…</span>
              <p>That’s where you come in.</p>
            </div>
            <ArrowUpRight className="art-arrow" size={26} />
          </div>
          <span className="sticker">
            PLOT
            <br />
            <b>TWIST!</b>
          </span>
          <span className="handwritten">your friends. your chaos. ↗</span>
        </div>
      </section>
      <div className="feature-strip">
        <span>
          <Users size={17} /> Made for 2–8 players
        </span>
        <span>
          <Zap size={17} /> Play in real time
        </span>
        <span>
          <MessageCircle size={17} /> Every story is a surprise
        </span>
        <span>
          <Gamepad2 size={17} /> No downloads. Just play.
        </span>
      </div>
      <section className="how-section" id="how">
        <div className="section-heading">
          <div>
            <span className="eyebrow muted">
              SMALL SENTENCES. BIG PLOT ENERGY.
            </span>
            <h2>Great stories take a few bad ideas.</h2>
          </div>
          <span className="section-note">
            Here’s how the chaos unfolds <span>↘</span>
          </span>
        </div>
        <div className="steps">
          {[
            {
              icon: <Users />,
              title: "Gather your cast",
              text: "Make a room, send the link, and round up your favorite overthinkers.",
            },
            {
              icon: <Feather />,
              title: "Write. Twist. Pass.",
              text: "See only the last panel. Add your part, then pass the story to the next mind.",
            },
            {
              icon: <Sparkles />,
              title: "Reveal the ridiculous",
              text: "Watch your entire story unfold as a comic. Laugh, share, and do it all again.",
            },
          ].map((step, i) => (
            <div className="step" key={step.title}>
              <span className={`step-icon ${colors[i]}`}>{step.icon}</span>
              <span className="step-number">0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="genre-section">
        <span>EVERY MOOD HAS A STORY.</span>
        <div>
          {genres.slice(0, 5).map((g, i) => (
            <span className="genre-pill" key={g}>
              {genreIcons[i]} {g}
            </span>
          ))}
          <span className="genre-more">+ a little chaos</span>
        </div>
      </section>
    </>
  );
}
function RoomForm({
  kind,
  busy,
  submit,
  back,
}: {
  kind: string;
  busy: boolean;
  submit: (event: string, data: object) => void;
  back: () => void;
}) {
  const [genre, setGenre] = useState("Comedy");
  const [count, setCount] = useState(6);
  const create = kind === "create";
  return (
    <section className="form-page">
      <button className="text-button" onClick={back}>
        <ChevronLeft size={17} /> Back to the good stuff
      </button>
      <div className="form-layout">
        <div className="form-intro">
          <span className="eyebrow">
            <Sparkles size={15} /> LET’S MAKE SOMETHING WEIRD
          </span>
          <h1>
            {create ? (
              <>
                Every great story
                <br />
                starts with <em>your room.</em>
              </>
            ) : (
              <>
                Your cast
                <br />
                is <em>waiting.</em>
              </>
            )}
          </h1>
          <p>
            {create
              ? "A few friends. One sentence each. Absolutely no idea where this is going."
              : "Grab your invitation code, pick a name, and bring your most unexpected ideas."}
          </p>
          <div className="form-decoration">
            <MessageCircle size={92} />
            <span>
              “What could
              <br />
              possibly go wrong?”
            </span>
          </div>
          <p className="fine-print">No accounts. No pressure. Just play.</p>
        </div>
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            submit(create ? "room:create" : "room:join", {
              nickname: f.get("nickname"),
              ...(create
                ? { name: f.get("name"), genre, maxPlayers: count }
                : { code: f.get("code") }),
            });
          }}
        >
          <h2>{create ? "Set the scene" : "Join the story"}</h2>
          <p>
            {create
              ? "You’re the host. Make it your kind of chaos."
              : "An invitation to the unexpected."}
          </p>
          <label>
            Your nickname
            <input
              name="nickname"
              placeholder="e.g. Plot twist enthusiast"
              maxLength={20}
              required
              autoComplete="nickname"
            />
          </label>
          {create ? (
            <>
              <label>
                Room name
                <input
                  name="name"
                  placeholder="e.g. The midnight plot club"
                  maxLength={48}
                  required
                  defaultValue="The Plot Thickens"
                />
              </label>
              <label>
                Maximum players{" "}
                <span className="label-value">{count} players</span>
                <input
                  aria-label="Maximum players"
                  type="range"
                  min="2"
                  max="8"
                  value={count}
                  onChange={(e) => setCount(+e.target.value)}
                />
                <span className="range-label">
                  <span>2 · cozy chaos</span>
                  <span>8 · full cast</span>
                </span>
              </label>
              <fieldset>
                <legend>Pick your genre</legend>
                <div className="genre-grid">
                  {genres.map((g, i) => (
                    <button
                      type="button"
                      className={genre === g ? "selected" : ""}
                      aria-pressed={genre === g}
                      onClick={() => setGenre(g)}
                      key={g}
                    >
                      {genreIcons[i]} {g}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="mode">
                <span>
                  <Feather size={18} /> Blind Relay
                </span>
                <span>ONE TURN. ONE TWIST.</span>
              </div>
            </>
          ) : (
            <label>
              Room code
              <input
                name="code"
                className="code-input"
                placeholder="YOUR ROOM CODE"
                defaultValue={
                  new URLSearchParams(location.search).get("room") || ""
                }
                maxLength={2048}
                required
                autoComplete="off"
                autoCapitalize="characters"
              />
            </label>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : create ? (
              <Plus size={18} />
            ) : (
              <ArrowRight size={18} />
            )}{" "}
            {create ? "Create my room" : "Let me in"}
            <ArrowUpRight size={18} />
          </button>
          <p className="form-footnote">
            {create
              ? "Your invite link will be ready in a second."
              : "The best plot twist? You showing up."}
          </p>
        </form>
      </div>
    </section>
  );
}
function GameRoom({
  room,
  action,
  busy,
  notify,
}: {
  room: Room;
  action: (event: string, data?: object) => Promise<boolean>;
  busy: boolean;
  notify: (text: string) => void;
}) {
  const draftKey = `plotrelay-draft:${room.code}:${room.gameId}:${room.you}:${room.turn}`;
  const [text, setText] = useState(() => readDraft(draftKey));
  const [twist, setTwist] = useState("");
  const [visible, setVisible] = useState(0);
  const [replay, setReplay] = useState(0);
  const clockOffset = useRef(room.serverTime - Date.now());
  const [now, setNow] = useState(() => Date.now() + clockOffset.current);
  const [showInvite, setShowInvite] = useState(false);
  const inviteUrl = `${location.origin}/?room=${room.code}`;
  const host = room.you === room.hostId;
  const writer = room.currentPlayerId === room.you;
  const current = room.players.find((p) => p.id === room.currentPlayerId);
  const connected = room.players.filter((p) => p.connected).length;
  useEffect(() => {
    clockOffset.current = room.serverTime - Date.now();
  }, [room.serverTime]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + clockOffset.current), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (room.status !== "reveal") return;
    setVisible(0);
    let count = 0;
    const t = setInterval(() => {
      count++;
      setVisible((value) => Math.max(value, count));
      if (count >= room.panels.length) clearInterval(t);
    }, 850);
    return () => clearInterval(t);
  }, [room.status, room.panels.length, replay]);
  async function copyInvite() {
    const url = inviteUrl;
    try {
      await navigator.clipboard.writeText(url);
      notify("Invitation link copied. Assemble your cast!");
    } catch {
      setShowInvite(true);
      notify(
        "Copy the invitation from the field below. Clipboard access is unavailable in this browser.",
      );
    }
  }
  async function share() {
    try {
      const blob = await storyImage(room);
      const file = new File([blob], "plotrelay-story.png", {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] }))
        await navigator.share({ title: room.name, files: [file] });
      else if (navigator.share)
        await navigator.share({
          title: room.name,
          text: room.panels.map((p) => `${p.author}: ${p.text}`).join("\n\n"),
        });
      else {
        download(blob, "plotrelay-story.png");
        notify("Story downloaded — ready to share.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        notify((error as Error).message);
    }
  }
  const players = (
    <div className="player-list">
      <div className="list-title">
        <span>THE CAST</span>
        <span>
          {connected}/{room.maxPlayers} online
        </span>
      </div>
      <AnimatePresence>
        {room.players.map((p, i) => (
          <motion.div
            layout
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            key={p.id}
            className={`player-card ${p.id === room.currentPlayerId && room.status === "writing" ? "active" : ""}`}
          >
            <Avatar player={p} index={i} />
            <div>
              <strong>
                {p.nickname} {p.id === room.you && <small>(you)</small>}
              </strong>
              <span>
                {p.left
                  ? "Left the room"
                  : p.skipped
                    ? "Turn skipped"
                    : !p.connected
                      ? "Reconnecting…"
                      : p.id === room.hostId
                        ? "Host · chief plot instigator"
                        : room.status === "writing" &&
                            p.id === room.currentPlayerId
                          ? "Cooking up a plot twist…"
                          : "Ready for a little chaos"}
              </span>
            </div>
            {p.id === room.hostId ? (
              <Crown size={16} className="host-crown" />
            ) : (
              <span className={`presence ${p.connected ? "online" : ""}`} />
            )}
            {host &&
              !p.connected &&
              !p.left &&
              (room.status === "lobby" || p.id === room.currentPlayerId) && (
                <button
                  className="skip-button"
                  disabled={busy || !p.skipAt || now < p.skipAt}
                  onClick={() => action("player:skip", { playerId: p.id })}
                >
                  {p.skipAt && now < p.skipAt
                    ? `${Math.ceil((p.skipAt - now) / 1000)}s`
                    : room.status === "lobby"
                      ? "Remove"
                      : "Skip"}
                </button>
              )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
  return (
    <section className="room-page">
      <div className="room-topline">
        <span className="eyebrow">
          <span className="live-dot" />{" "}
          {room.status === "lobby"
            ? "THE GREEN ROOM"
            : room.status === "writing"
              ? "STORY IN PROGRESS"
              : "IT’S A WRAP"}
        </span>
        <button
          className="text-button"
          onClick={() => action("room:leave")}
          disabled={busy}
        >
          <LogOut size={16} /> Leave room
        </button>
      </div>
      {showInvite && (
        <div className="invite-fallback">
          <label>
            Invitation link
            <input
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <button className="text-button" onClick={() => setShowInvite(false)}>
            Hide link
          </button>
        </div>
      )}
      <div className="room-heading">
        <div>
          <h1>{room.name}</h1>
          <p>
            {room.genre} <span>·</span> Blind Relay <span>·</span>{" "}
            {room.players.length} minds, one story
          </p>
        </div>
        <button className="room-code" onClick={copyInvite}>
          <span>ROOM CODE</span>
          <strong>
            {room.code} <Copy size={16} />
          </strong>
        </button>
      </div>
      {room.status === "reveal" ? (
        <div className="reveal">
          <div className="reveal-heading">
            <span className="eyebrow">
              <Sparkles size={16} /> YOUR COLLECTIVE MASTERPIECE
            </span>
            <h2>Well, that escalated.</h2>
            <p>One sentence led to another. And then… this happened.</p>
          </div>
          <div className="reveal-grid" key={replay}>
            {room.panels.slice(0, visible).map((p, i) => (
              <Comic panel={p} index={i} key={p.playerId} />
            ))}
          </div>
          {visible < room.panels.length ? (
            <button
              className="text-button"
              onClick={() => setVisible(room.panels.length)}
            >
              Show the whole story <ArrowRight size={16} />
            </button>
          ) : (
            <div className="reveal-actions">
              <button
                className="button secondary"
                onClick={() => setReplay((v) => v + 1)}
              >
                <RotateCcw size={17} /> Replay reveal
              </button>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    download(await storyImage(room), "plotrelay-story.png");
                  } catch (error) {
                    notify((error as Error).message);
                  }
                }}
              >
                <Download size={17} /> Download comic
              </button>
              <button className="button secondary" onClick={share}>
                <Share2 size={17} /> Share story
              </button>
              {host ? (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => action("game:reset")}
                >
                  Back to lobby <ArrowRight size={17} />
                </button>
              ) : (
                <p>
                  The host can bring everyone back to the lobby for another
                  story.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="room-grid">
          <aside>
            {players}
            <div className="rules-card">
              <span>
                <MessageCircle size={18} /> A little mystery makes it better.
              </span>
              <p>
                You only see the panel before yours. The full story stays a
                secret until everyone’s had a turn.
              </p>
              <span className="small-note">
                240 characters. Infinite possibilities.
              </span>
            </div>
          </aside>
          <div className="play-area">
            {room.status === "lobby" ? (
              <div className="lobby-card">
                <div className="lobby-illustration">
                  <span className="orbit-small" />
                  <Avatar index={0} />
                  <Avatar index={1} />
                  <Avatar index={2} />
                  <span className="lobby-star">✦</span>
                </div>
                <span className="eyebrow muted">
                  THE BEST STORIES START WITH FRIENDS
                </span>
                <h2>Your cast is coming together.</h2>
                <p>
                  Send your invite. Gather your co-conspirators.
                  <br />
                  An unpredictable story is one click away.
                </p>
                <button className="button secondary" onClick={copyInvite}>
                  <Link size={18} /> Copy invitation link
                </button>
                <div className="lobby-divider" />
                {host ? (
                  <button
                    className="button primary full"
                    disabled={
                      busy || connected < 2 || connected !== room.players.length
                    }
                    onClick={() => action("game:start")}
                  >
                    <Zap size={19} /> Start the story <ArrowRight size={19} />
                  </button>
                ) : (
                  <div className="waiting-host">
                    <LoaderCircle className="spin" size={18} /> Waiting for the
                    host to start the story
                  </div>
                )}
                <span className="fine-print">
                  {connected < 2
                    ? "At least 2 connected players needed to start."
                    : "The host writes first. Everyone adds one panel."}
                </span>
              </div>
            ) : writer ? (
              <div className="writing-card">
                <div className="writing-header">
                  <span className="pill">
                    <Feather size={14} /> YOUR TURN
                  </span>
                  <span>
                    TURN {room.turn + 1} / {room.players.length}
                  </span>
                </div>
                <h2>
                  {room.previous
                    ? "And then things got weird…"
                    : "Once upon a plot twist…"}
                </h2>
                <p>
                  {room.previous
                    ? "Pick up the thread. Take it somewhere unexpected."
                    : "Set the scene. Your first sentence starts everything."}
                </p>
                {room.previous && (
                  <div className="previous-panel">
                    <span>THE PREVIOUS PANEL · {room.previous.author}</span>
                    <p>“{room.previous.text}”</p>
                  </div>
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (
                      await action("story:submit", {
                        text,
                        gameId: room.gameId,
                        turn: room.turn,
                      })
                    )
                      writeDraft(draftKey, "");
                  }}
                >
                  <label className="sr-only" htmlFor="contribution">
                    Your story contribution
                  </label>
                  <textarea
                    id="contribution"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      writeDraft(draftKey, e.target.value);
                    }}
                    maxLength={240}
                    placeholder={
                      room.previous
                        ? "Little did they know…"
                        : "One morning, I discovered that my refrigerator…"
                    }
                    rows={4}
                  />
                  <div className="writing-tools">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        setTwist(
                          twists[Math.floor(Math.random() * twists.length)],
                        )
                      }
                    >
                      <Shuffle size={16} /> Give me a twist
                    </button>
                    <span>{240 - text.length} characters left</span>
                  </div>
                  {twist && (
                    <div className="twist">
                      <Sparkles size={17} />
                      {twist}
                    </div>
                  )}
                  <div className="preview-label">
                    A SNEAK PEEK AT YOUR PANEL
                  </div>
                  <div className="live-preview">
                    <MessageCircle size={21} />
                    <p>{text || "Your words go here. The chaos follows."}</p>
                  </div>
                  <button
                    className="button primary full"
                    disabled={busy || !text.trim()}
                    type="submit"
                  >
                    {busy ? (
                      <LoaderCircle size={18} className="spin" />
                    ) : (
                      <Send size={18} />
                    )}{" "}
                    Pass the plot <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="waiting-card">
                <div className="waiting-orbit">
                  <Avatar player={current} index={room.turn} />
                  <span>✦</span>
                  <span>✧</span>
                </div>
                <span className="eyebrow muted">A PLOT TWIST IS BREWING</span>
                <h2>
                  {current?.nickname || "Your cast"} is{" "}
                  {current?.connected ? "writing" : "reconnecting"}
                  <span className="dots">…</span>
                </h2>
                <p>
                  {current?.connected
                    ? "Somewhere, a perfectly good story is taking a very strange turn."
                    : "Their place is saved. After the grace period, the host can skip this turn."}
                </p>
                <div className="progress">
                  <span
                    style={{
                      width: `${(room.turn / room.players.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="progress-label">
                  <span>{room.completed} panels written</span>
                  <span>{room.players.length} turns total</span>
                </div>
                <div className="waiting-tip">
                  <Sparkles size={20} />
                  <span>
                    {room.turn >
                    room.players.findIndex((p) => p.id === room.you)
                      ? "Your part is in. Now let the others surprise you."
                      : "Your turn is coming. Keep your wildest idea ready."}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
function App() {
  const [page, setPage] = useState(
    new URLSearchParams(location.search).has("room") ? "join" : "home",
  );
  const [room, setRoom] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [restoring, setRestoring] = useState(!!getSession());
  useEffect(() => {
    let generation = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const invitation = new URLSearchParams(location.search)
      .get("room")
      ?.trim()
      .toUpperCase();
    // An explicit invitation takes priority over an unrelated saved room.
    let session = getSession();
    if (invitation && session && session.code !== invitation) session = null;
    const onSession = (value: Session) => {
      session = value;
      if (!saveSession(value))
        setMessage(
          "Browser storage is unavailable. Keep this tab open to preserve your session.",
        );
    };
    const restore = async (attempt: number) => {
      if (!socket.connected || attempt !== generation) return;
      if (!session) {
        setConnected(true);
        setRestoring(false);
        return;
      }
      setRestoring(true);
      try {
        await request("player:reconnect", session);
        if (attempt !== generation) return;
        setConnected(true);
        setRestoring(false);
      } catch (error) {
        if (attempt !== generation) return;
        if (error instanceof RequestError && error.code === "SESSION_EXPIRED") {
          clearSession();
          session = null;
          setRoom(null);
          setPage(invitation ? "join" : "home");
          setRestoring(false);
          setConnected(true);
          setMessage(error.message);
        } else {
          // A timeout or temporary rate limit is not proof of an expired room.
          setMessage(
            "Reconnecting to your room. Your place and writing are saved.",
          );
          retry = setTimeout(() => {
            void restore(attempt);
          }, 2000);
        }
      }
    };
    const onConnect = () => {
      clearTimeout(retry);
      setConnected(false);
      void restore(++generation);
    };
    const onDisconnect = () => {
      ++generation;
      clearTimeout(retry);
      setConnected(false);
    };
    const onState = (state: Room) => {
      setRoom(state);
      setPage("room");
    };
    const onExpired = () => {
      ++generation;
      clearTimeout(retry);
      clearSession();
      session = null;
      setRoom(null);
      setPage("home");
      setRestoring(false);
      setConnected(socket.connected);
      history.replaceState({}, "", location.pathname);
      setMessage(
        "This room has expired after inactivity. Start a fresh story.",
      );
    };
    const onReplaced = () => {
      ++generation;
      clearTimeout(retry);
      releaseSession();
      session = null;
      setRoom(null);
      setPage("home");
      setRestoring(false);
      setConnected(false);
      setMessage(
        "This player is active in a duplicated tab. Continue there, or reconnect here to join as another player.",
      );
    };
    const onLeave = () => {
      session = null;
    };
    // Clear the closure's saved session after a deliberate local leave.
    window.addEventListener("plotrelay:leave", onLeave);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onState);
    socket.on("player:session", onSession);
    socket.on("room:expired", onExpired);
    socket.on("session:replaced", onReplaced);
    socket.on("connect_error", onDisconnect);
    socket.connect();
    return () => {
      ++generation;
      clearTimeout(retry);
      window.removeEventListener("plotrelay:leave", onLeave);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onState);
      socket.off("player:session", onSession);
      socket.off("room:expired", onExpired);
      socket.off("session:replaced", onReplaced);
      socket.off("connect_error", onDisconnect);
      socket.disconnect();
    };
  }, []);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 9000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  async function action(event: string, data = {}) {
    if (pending.current || !connected) return false;
    pending.current = true;
    setBusy(true);
    try {
      const reply = await request(event, data);
      if (reply.token && reply.code) {
        saveSession({ code: reply.code, token: reply.token });
        history.replaceState({}, "", `${location.pathname}?room=${reply.code}`);
      }
      if (event === "room:leave") {
        clearSession();
        window.dispatchEvent(new Event("plotrelay:leave"));
        setRoom(null);
        setPage("home");
        history.replaceState({}, "", "/");
      }
      return true;
    } catch (error) {
      setMessage((error as Error).message);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function navigate(next: string) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return (
    <MotionConfig reducedMotion="user">
      <div className="site-shell">
        <header>
          <button
            className="logo-button"
            onClick={() => !room && navigate("home")}
            aria-label="PlotRelay home"
          >
            <Logo />
          </button>
          <nav>
            {!room && (
              <a href="#how" onClick={() => navigate("home")}>
                How to play
              </a>
            )}
            <span className="nav-divider" />
            <span className="nav-note">
              <span className={`live-dot ${connected ? "" : "offline"}`} />
              {connected ? "A little chaos. A lot of fun." : "Connecting…"}
            </span>
            {!room && (
              <button className="header-join" onClick={() => navigate("join")}>
                Join a room <ArrowUpRight size={16} />
              </button>
            )}
          </nav>
        </header>
        {!connected && (
          <div className="connection-banner" role="status">
            <LoaderCircle className="spin" size={16} /> Reconnecting to
            PlotRelay.{" "}
            {getSession()
              ? "Your place is saved while the room is active."
              : "Waiting for the game server."}
            <button
              className="text-button"
              onClick={() => {
                socket.disconnect();
                socket.connect();
              }}
            >
              Retry connection
            </button>
          </div>
        )}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={room ? "room" : page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {restoring && !room && connected ? (
                <div className="restoring">
                  <LoaderCircle className="spin" /> Finding your place in the
                  story…
                </div>
              ) : room ? (
                <GameRoom
                  key={`${room.code}:${room.you}:${room.gameId}:${room.turn}`}
                  room={room}
                  action={action}
                  busy={busy || !connected || restoring}
                  notify={setMessage}
                />
              ) : page === "home" ? (
                <Landing navigate={navigate} />
              ) : (
                <RoomForm
                  kind={page}
                  busy={busy || !connected || restoring}
                  submit={action}
                  back={() => navigate("home")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer>
          <Logo />
          <span>Made for the “what if” people.</span>
          <span>
            No scripts. No rules.* Just stories.
            <small>*Okay, a few rules.</small>
          </span>
        </footer>
        <AnimatePresence>
          {message && (
            <motion.div
              role="status"
              className="toast"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <MessageCircle size={20} />
              <span>{message}</span>
              <button
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
