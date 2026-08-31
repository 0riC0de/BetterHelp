"use client";

import HeadphonesOutlined from "@mui/icons-material/HeadphonesOutlined";
import PauseOutlined from "@mui/icons-material/PauseOutlined";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
import SpeakerOutlined from "@mui/icons-material/SpeakerOutlined";
import VolumeDownOutlined from "@mui/icons-material/VolumeDownOutlined";
import VolumeOffOutlined from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlined from "@mui/icons-material/VolumeUpOutlined";
import { Box, IconButton, MenuItem, Select, Slider, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";

interface AudioOutputDevice {
  deviceId: string;
  label: string;
}

interface AudioMediaPlayerProps {
  src: string;
  label: string;
}

function getVolumeIcon(volume: number, muted: boolean): ReactElement {
  if (muted || volume === 0) return <VolumeOffOutlined />;
  if (volume < 0.5) return <VolumeDownOutlined />;
  return <VolumeUpOutlined />;
}

export default function AudioMediaPlayer({ src, label }: AudioMediaPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [outputDeviceId, setOutputDeviceId] = useState("default");
  const [devices, setDevices] = useState<AudioOutputDevice[]>([]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.deviceId === outputDeviceId),
    [devices, outputDeviceId],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [muted, volume]);

  useEffect(() => {
    const audio = audioRef.current as HTMLMediaElement & {
      setSinkId?: (sinkId: string) => Promise<void>;
    } | null;
    if (!audio?.setSinkId || outputDeviceId === "default") return;
    void audio.setSinkId(outputDeviceId).catch(() => setOutputDeviceId("default"));
  }, [outputDeviceId, src]);

  useEffect(() => {
    const loadDevices = async (): Promise<void> => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        mediaDevices
          .filter((device) => device.kind === "audiooutput")
          .map((device) => ({ deviceId: device.deviceId, label: device.label || "Speaker" })),
      );
    };

    void loadDevices();
    const onDeviceChange = () => void loadDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    setIsPlaying(false);
  }, [src]);

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  }

  function handleVolumeChange(value: number): void {
    setVolume(value);
    setMuted(value === 0);
  }

  return (
    <Box sx={{ p: 1, minWidth: 280, maxWidth: "100%" }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Tooltip title={isPlaying ? "Pause" : "Play"}>
            <IconButton size="small" onClick={() => void togglePlayback()} aria-label={isPlaying ? "Pause audio" : "Play audio"}>
              {isPlaying ? <PauseOutlined /> : <PlayArrowOutlined />}
            </IconButton>
          </Tooltip>
          <Tooltip title={muted || volume === 0 ? "Muted" : `${Math.round(volume * 100)}%`}>
            <IconButton size="small" onClick={() => setMuted((current) => !current)} aria-label="Toggle mute">
              {getVolumeIcon(volume, muted)}
            </IconButton>
          </Tooltip>
          <Slider
            size="small"
            value={muted ? 0 : volume}
            min={0}
            max={1}
            step={0.05}
            onChange={(_event, value) => handleVolumeChange(Array.isArray(value) ? value[0] : value)}
            sx={{ flex: 1, minWidth: 96 }}
            aria-label="Audio volume"
          />
          <Tooltip title={selectedDevice?.label ?? "System default"}>
            <Select
              size="small"
              value={outputDeviceId}
              onChange={(event) => setOutputDeviceId(String(event.target.value))}
              sx={{ minWidth: 44, maxWidth: 44, "& .MuiSelect-select": { py: 0.5, px: 0.75, display: "flex", alignItems: "center", justifyContent: "center" } }}
              renderValue={() => <SpeakerOutlined fontSize="small" />}
              aria-label="Select audio output device"
            >
              <MenuItem value="default"><Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><HeadphonesOutlined fontSize="small" /><Typography variant="body2">System default</Typography></Stack></MenuItem>
              {devices.map((device) => (
                <MenuItem key={device.deviceId} value={device.deviceId}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <SpeakerOutlined fontSize="small" />
                    <Typography variant="body2" noWrap>{device.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </Tooltip>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </Typography>
      </Stack>
    </Box>
  );
}
