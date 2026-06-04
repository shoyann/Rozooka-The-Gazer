import { useEffect, useRef } from "react";

interface VectorRadarProps {
  isScanning: boolean;
  scanProgress: number;
  accentColor?: string;
}

export default function VectorRadar({
  isScanning,
  scanProgress,
  accentColor = "#C8860A",
}: VectorRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let animationFrameId = 0;
    let angle = 0;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const width = rect?.width ?? 640;
      const height = rect?.height ?? 360;
      const ratio = window.devicePixelRatio || 1;

      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(ratio, ratio);
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.width / ratio;
      const height = canvas.height / ratio;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.45;
      const timeFactor = Date.now();

      context.clearRect(0, 0, width, height);

      context.fillStyle = "rgba(200, 134, 10, 0.025)";
      context.beginPath();
      context.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = "rgba(245, 240, 232, 0.03)";
      context.lineWidth = 0.5;

      for (
        let radius = maxRadius * 0.2;
        radius <= maxRadius;
        radius += maxRadius * 0.2
      ) {
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.stroke();
      }

      context.beginPath();
      context.moveTo(centerX - maxRadius, centerY);
      context.lineTo(centerX + maxRadius, centerY);
      context.moveTo(centerX, centerY - maxRadius);
      context.lineTo(centerX, centerY + maxRadius);
      context.stroke();

      context.strokeStyle = "rgba(200, 134, 10, 0.15)";
      context.font = "8px monospace";
      context.fillStyle = "rgba(200, 134, 10, 0.4)";

      for (let degree = 0; degree < 360; degree += 30) {
        const radians = (degree * Math.PI) / 180;
        const x1 = centerX + maxRadius * Math.cos(radians);
        const y1 = centerY + maxRadius * Math.sin(radians);
        const x2 =
          centerX +
          (maxRadius - (degree % 90 === 0 ? 8 : 4)) * Math.cos(radians);
        const y2 =
          centerY +
          (maxRadius - (degree % 90 === 0 ? 8 : 4)) * Math.sin(radians);

        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();

        if (degree % 90 === 0) {
          const labelX = centerX + (maxRadius + 12) * Math.cos(radians) - 8;
          const labelY = centerY + (maxRadius + 12) * Math.sin(radians) + 3;
          context.fillText(`${degree}D`, labelX, labelY);
        }
      }

      angle += isScanning ? 0.05 : 0.005;
      context.strokeStyle = `${accentColor}4d`;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(centerX, centerY, maxRadius * 0.8, angle, angle + Math.PI * 0.4);
      context.stroke();
      context.beginPath();
      context.arc(
        centerX,
        centerY,
        maxRadius * 0.8,
        angle + Math.PI,
        angle + Math.PI * 1.4,
      );
      context.stroke();

      if (isScanning) {
        const sweepGradient = context.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          maxRadius * 0.95,
        );
        sweepGradient.addColorStop(0, "rgba(200, 134, 10, 0)");
        sweepGradient.addColorStop(0.66, "rgba(200, 134, 10, 0)");
        sweepGradient.addColorStop(1, "rgba(200, 134, 10, 0.07)");

        context.save();
        context.translate(centerX, centerY);
        context.rotate(angle);
        context.beginPath();
        context.moveTo(0, 0);
        context.arc(0, 0, maxRadius * 0.95, -0.2, 0.55);
        context.closePath();
        context.fillStyle = sweepGradient;
        context.fill();
        context.restore();
      }

      let sweepY = centerY;
      if (isScanning) {
        sweepY = centerY - maxRadius + maxRadius * 2 * scanProgress;
      } else {
        sweepY = centerY + Math.sin(timeFactor / 800) * (maxRadius * 0.7);
      }

      const laserWidth = maxRadius * 0.9;
      context.strokeStyle = "rgba(200, 134, 10, 0.4)";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(centerX - laserWidth, sweepY);
      context.lineTo(centerX + laserWidth, sweepY);
      context.stroke();

      context.fillStyle = "rgba(200, 134, 10, 0.15)";
      context.fillRect(centerX - 3, sweepY - 3, 6, 6);
      context.beginPath();
      context.arc(centerX, centerY, 3, 0, Math.PI * 2);
      context.fillStyle = "rgba(200, 134, 10, 0.3)";
      context.fill();

      const targetCount = isScanning ? 4 : 2;
      for (let index = 0; index < targetCount; index += 1) {
        const positionAngle =
          (timeFactor / (12000 + index * 5000) + index * 1.6) % (Math.PI * 2);
        const distance =
          maxRadius * (0.3 + Math.sin(timeFactor / 3000 + index) * 0.2);
        const targetX = centerX + Math.cos(positionAngle) * distance;
        const targetY = centerY + Math.sin(positionAngle) * distance;

        const boxSize = isScanning ? 12 : 8;
        context.strokeStyle = isScanning
          ? "#8B2A2A"
          : "rgba(245, 240, 232, 0.3)";
        context.strokeRect(
          targetX - boxSize / 2,
          targetY - boxSize / 2,
          boxSize,
          boxSize,
        );

        context.beginPath();
        context.moveTo(targetX - 2, targetY);
        context.lineTo(targetX + 2, targetY);
        context.moveTo(targetX, targetY - 2);
        context.lineTo(targetX, targetY + 2);
        context.stroke();

        context.fillStyle = "rgba(245, 240, 232, 0.5)";
        context.font = "6px monospace";
        context.fillText(
          `ID:0x${Math.floor(distance).toString(16).toUpperCase()}`,
          targetX + boxSize,
          targetY,
        );
        context.fillText(
          `D:${(distance * 11.23).toFixed(1)}m`,
          targetX + boxSize,
          targetY + 7,
        );
      }

      context.strokeStyle = "rgba(245, 240, 232, 0.08)";
      context.lineWidth = 1;
      context.beginPath();
      for (
        let x = centerX - maxRadius * 0.8;
        x < centerX + maxRadius * 0.8;
        x += 4
      ) {
        const offset =
          Math.sin(x * 0.05 + timeFactor * 0.004) * Math.cos(x * 0.01) * 15;
        if (x === centerX - maxRadius * 0.8) {
          context.moveTo(x, centerY + offset);
        } else {
          context.lineTo(x, centerY + offset);
        }
      }
      context.stroke();

      animationFrameId = window.requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [accentColor, isScanning, scanProgress]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full bg-black"
      style={{ opacity: 0.95 }}
    />
  );
}
