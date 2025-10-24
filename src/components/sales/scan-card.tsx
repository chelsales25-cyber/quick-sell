
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSale } from "@/components/sales/sale-provider";
import { Camera, CameraOff, QrCode, Loader2, ShieldAlert, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "../ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CameraDevice {
  id: string;
  label: string;
}

const isUrl = (text: string): boolean => {
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};


export function ScanCard() {
  const { addProductToSale } = useSale();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isSecureContext, setIsSecureContext] = useState(true);

  // State for URL handling
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [isUrlAlertOpen, setIsUrlAlertOpen] = useState(false);


  // Stop the stream cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setIsCameraReady(false);
    }
  }, []);

  // Get camera permissions and list devices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setIsSecureContext(false);
      setHasPermission(false);
      return;
    }
    setIsSecureContext(true);

    const getCamerasAndPermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          console.error("Media devices API not available.");
          setHasPermission(false);
          return;
        }

        // Request permission which is required to get device labels
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // We have permission now, we can stop the temporary stream
        stream.getTracks().forEach(track => track.stop());
        setHasPermission(true);

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(
          (device) => device.kind === "videoinput"
        );
        
        if (videoDevices.length > 0) {
          setCameras(
            videoDevices.map((d, i) => ({ id: d.deviceId, label: d.label || `กล้อง ${i + 1}` }))
          );
          // Prefer back camera if available
          const backCamera = videoDevices.find((d) =>
            d.label.toLowerCase().includes("back")
          );
          setSelectedCameraId(backCamera?.deviceId || videoDevices[0].deviceId);
        } else {
            toast({
                variant: 'destructive',
                title: 'ไม่พบกล้อง',
                description: 'ไม่พบอุปกรณ์กล้องในเครื่องของคุณ',
            })
            setHasPermission(false);
        }
      } catch (err) {
        console.error("Error requesting camera permission or enumerating devices:", err);
        setHasPermission(false);
      }
    };

    getCamerasAndPermission();
    
    return () => {
      stopStream();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to start/switch camera stream when selection changes
  useEffect(() => {
    if (!hasPermission || !selectedCameraId) {
      return;
    }
  
    const startCameraStream = async () => {
      stopStream(); // Ensure any existing stream is stopped
      setIsCameraReady(false);

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedCameraId } },
        });
        streamRef.current = newStream;
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch(e => console.error("Video play failed", e));
        }
      } catch (err) {
        console.error("Error starting selected camera:", err);
        toast({
          variant: "destructive",
          title: "ไม่สามารถเปิดกล้องได้",
          description: "โปรดลองเลือกกล้องอื่น หรือตรวจสอบว่าไม่ได้ถูกใช้งานอยู่",
        });
      }
    };
  
    startCameraStream();
  
    // This cleanup function is crucial for stopping the stream when the component unmounts or selectedCameraId changes
    return () => {
      stopStream();
    };
  }, [selectedCameraId, hasPermission, stopStream, toast]);


  const handleScanClick = () => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isCameraReady) return;

    const video = videoRef.current;
    
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
        setIsProcessing(false);
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      if(isUrl(code.data)) {
        setScannedUrl(code.data);
        setIsUrlAlertOpen(true);
      } else {
        addProductToSale(code.data);
      }
    } else {
      toast({
        variant: "destructive",
        title: "สแกนไม่สำเร็จ",
        description: "ไม่พบ QR code ในภาพ ลองจัดตำแหน่งใหม่",
      });
    }
    
    setTimeout(() => setIsProcessing(false), 500);
  };

  const getButtonState = () => {
      if (isProcessing) {
          return { text: 'กำลังประมวลผล...', icon: <Loader2 className="mr-2 h-5 w-5 animate-spin" />, disabled: true };
      }
      if (hasPermission && !isCameraReady) {
          return { text: 'กำลังเตรียมกล้อง...', icon: <Loader2 className="mr-2 h-5 w-5 animate-spin" />, disabled: true };
      }
      if (!hasPermission) {
          return { text: 'ไม่สามารถเข้าถึงกล้อง', icon: <CameraOff className="mr-2 h-5 w-5" />, disabled: true };
      }
      return { text: 'สแกน QR Code', icon: <QrCode className="mr-2 h-5 w-5" />, disabled: false };
  }

  const buttonState = getButtonState();

  const handleOpenUrl = () => {
    if (scannedUrl) {
      window.open(scannedUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <>
      <AlertDialog open={isUrlAlertOpen} onOpenChange={setIsUrlAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                พบ URL ใน QR Code
            </AlertDialogTitle>
            <AlertDialogDescription>
                ข้อมูลที่สแกนได้คือลิงก์ต่อไปนี้ คุณต้องการเปิดลิงก์นี้ในแท็บใหม่หรือไม่?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-3 p-2 bg-muted rounded-md text-foreground break-all text-sm">
                {scannedUrl}
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction onClick={handleOpenUrl}>เปิดลิงก์</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>สแกนสินค้า</CardTitle>
          <CardDescription>
            เลือกกล้อง, จัดตำแหน่ง QR code แล้วกดปุ่มสแกน
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPermission && cameras.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="camera-select" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  <span>เลือกกล้อง</span>
              </Label>
              <Select
                value={selectedCameraId}
                onValueChange={(id) => setSelectedCameraId(id)}
                disabled={isProcessing || !hasPermission}
              >
                <SelectTrigger id="camera-select">
                  <SelectValue placeholder="เลือกกล้อง..." />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative aspect-square w-full max-w-sm mx-auto overflow-hidden rounded-md bg-muted">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              onCanPlay={() => setIsCameraReady(true)}
              onLoadedMetadata={() => setIsCameraReady(true)}
              className="h-full w-full object-cover"
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            
            {hasPermission === null && isSecureContext && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-muted-foreground">กำลังรอการอนุญาตกล้อง...</p>
              </div>
            )}

            {!isSecureContext && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
                <ShieldAlert className="mb-2 h-10 w-10 text-yellow-400" />
                <p className="font-bold text-white">ต้องใช้ HTTPS</p>
                <p className="text-sm text-white/80">
                  การเข้าถึงกล้องจำเป็นต้องใช้งานผ่านโปรโตคอลที่ปลอดภัย (HTTPS)
                </p>
              </div>
            )}

            {hasPermission === false && isSecureContext && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center">
                <CameraOff className="mb-2 h-10 w-10 text-destructive" />
                <p className="font-bold text-white">ไม่สามารถเข้าถึงกล้องได้</p>
                <p className="text-sm text-white/80">
                  กรุณาอนุญาตให้เข้าถึงกล้องในตั้งค่าเบราว์เซอร์
                </p>
              </div>
            )}
          </div>
          <Button 
              className="w-full" 
              size="lg" 
              onClick={handleScanClick} 
              disabled={buttonState.disabled}
          >
              {buttonState.icon}
              {buttonState.text}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
