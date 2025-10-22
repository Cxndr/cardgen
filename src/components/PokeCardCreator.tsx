"use client";

import { Jimp } from "jimp";

type JimpImage = Awaited<ReturnType<typeof Jimp.read>>;
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import "@/styles/poke.css";
import { DotLoader } from "react-spinners";
import { PokemonCardGenerator, PokemonCardData, ImagePosition } from "@/utils/cardGenerator";
import { useDebounce } from "@/utils/debounce";
import ImagePositionControls from "./ImagePositionControls";
import ImagePositionOverlay from "./ImagePositionOverlay";

export default function PokeCardCreator() {
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [lengthValue, setLengthValue] = useState("0'1\"");
  const [weightValue, setWeightValue] = useState("0.1");
  const [weightSlider, setWeightSlider] = useState(1);
  const [lengthSlider, setLengthSlider] = useState(1);
  
  // Image positioning state
  const [positioningEnabled, setPositioningEnabled] = useState(false);
  const [imagePosition, setImagePosition] = useState<ImagePosition>({
    x: 279, // Center of 558px width
    y: 195, // Center of 390px height
    scale: 1
  });
  const [defaultImagePosition, setDefaultImagePosition] = useState<ImagePosition>({
    x: 279,
    y: 195,
    scale: 1
  });

  // Function to calculate default scale for an image
  const calculateDefaultScale = useCallback((imageFile: File | null): Promise<number> => {
    return new Promise((resolve) => {
      if (!imageFile) {
        resolve(1); // MissingNo default scale
        return;
      }

      const img = document.createElement('img');
      img.onload = () => {
        const frameWidth = 558;
        const frameHeight = 390;
        
        // Calculate scale to fill frame while maintaining aspect ratio
        const scaleX = frameWidth / img.width;
        const scaleY = frameHeight / img.height;
        
        // Use the larger scale to ensure the frame is filled (smaller dimension fits, larger overflows)
        const fillScale = Math.max(scaleX, scaleY);
        
        resolve(fillScale);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageFile);
    });
  }, []);

  // Auto-calculate initial scale when image changes
  useEffect(() => {
    calculateDefaultScale(file).then((defaultScale) => {
      const defaultPos = {
        x: 279, // Center
        y: 195, // Center  
        scale: defaultScale
      };
      
      setDefaultImagePosition(defaultPos);
      setImagePosition(defaultPos);
    });
  }, [file, calculateDefaultScale]);

  const [formData, setFormData] = useState({
    name: "MissingNo.",
    type: "colorless",
    descType: "",
    flavorText: "",
    hp: "30",
    move1name: "",
    move1dmg: "",
    move2name: "",
    move2dmg: "",
    weakness: "none",
    resistance: "none",
    retreatCost: "",
  });

  // Debounce form data changes to reduce unnecessary regenerations
  const debouncedFormData = useDebounce(formData, 500);
  const debouncedImagePosition = useDebounce(imagePosition, 300);

  // Preload assets on component mount
  useEffect(() => {
    PokemonCardGenerator.preloadAssets()
      .then(() => {
        setAssetsLoaded(true);
      })
      .catch((error) => {
        console.error("Failed to load assets:", error);
        // Still set to true to prevent infinite loading
        setAssetsLoaded(true);
      });
  }, []);

  const generateCard = useCallback(async () => {
    // Don't generate card while positioning mode is enabled (for real-time feedback)
    if (isGeneratingRef.current || positioningEnabled || !assetsLoaded) return;
    
    isGeneratingRef.current = true;
    setIsGenerating(true);
    
    try {
      let inputImage: JimpImage;
      
      if (!file) {
        inputImage = await Jimp.read("/poke/missingno.png");
      } else {
        const buffer = await file.arrayBuffer();
        inputImage = await Jimp.read(buffer);
      }

      const cardData: PokemonCardData = {
        ...debouncedFormData,
        lengthValue,
        weightValue,
      };

      const outputImage = await PokemonCardGenerator.generateCard(
        inputImage,
        cardData,
        // Use positioning if user has ever enabled it and moved the image from default position
        (debouncedImagePosition.x !== defaultImagePosition.x || 
         debouncedImagePosition.y !== defaultImagePosition.y || 
         debouncedImagePosition.scale !== defaultImagePosition.scale),
        debouncedImagePosition
      );

      const base64 = await outputImage.getBase64("image/png");
      setOutput(base64);
    } catch (error) {
      console.error("Error generating card:", error);
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  }, [file, debouncedFormData, lengthValue, weightValue, positioningEnabled, debouncedImagePosition, assetsLoaded, defaultImagePosition]);

  // Generate card when dependencies change (including when assets are loaded)
  useEffect(() => {
    generateCard();
  }, [generateCard]);

  // Generate final card when positioning mode is turned off
  useEffect(() => {
    if (!positioningEnabled) {
      generateCard();
    }
  }, [positioningEnabled, generateCard]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setFile(e.target.files[0]);
  }

  function handleWeightSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setWeightSlider(parseInt(e.target.value));
    const value = parseInt(e.target.value);
    if (value <= 100) {
      setWeightValue((value / 10).toFixed(1));
    } else {
      setWeightValue((value - 92).toString());
    }
  }

  function handleLengthSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setLengthSlider(parseInt(e.target.value));
    const value = parseInt(e.target.value);
    const feet = Math.floor(value / 12);
    const inches = value % 12;
    if (inches === 0) {
      setLengthValue(`${feet}'`);
    } else {
      setLengthValue(`${feet}'${inches}"`);
    }
  }

  function handleDownload(e: React.FormEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (!output) return;
    const link = document.createElement("a");
    link.href = output;
    link.download = `${formData.name || "pokemon-card"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newFormData = new FormData(e.currentTarget);

    setFormData({
      name: newFormData.get("name") as string,
      type: newFormData.get("type") as string,
      descType: newFormData.get("desc-type") as string,
      flavorText: newFormData.get("flavor-text") as string,
      hp: newFormData.get("hp") as string,
      move1name: newFormData.get("move1name") as string,
      move1dmg: newFormData.get("move1dmg") as string,
      move2name: newFormData.get("move2name") as string,
      move2dmg: newFormData.get("move2dmg") as string,
      weakness: newFormData.get("weakness") as string,
      resistance: newFormData.get("resistance") as string,
      retreatCost: newFormData.get("retreat-cost") as string,
    });
  }

  return (
    <div className="flex flex-col gap-0 p-0 pt-4 w-full h-svh justify-evenly items-center">
      <h1 className="handwriting text-5xl opacity-50 text-zinc-100">
        Pokemon Card Generator
      </h1>
      <div className="w-full grow flex justify-between p-4 gap-4">
        <form
          onSubmit={handleUpdate}
          onChange={handleUpdate}
          className="flex align-middle gap-10 grow text-black text-md rounded-3xl bg-slate-700 bg-opacity-40 px-12 py-10 overflow-y-auto"
        >
          <div className="flex flex-col gap-5">
            <div>
              <label className="" htmlFor="image-select">
                Image
              </label>
              <input
                name="image-select"
                type="file"
                accept="image/*"
                onChange={handleFile}
              />
            </div>

            {/* Image positioning controls */}
            <ImagePositionControls
              // position={imagePosition}
              onPositionChange={setImagePosition}
              isEnabled={positioningEnabled}
              onToggle={setPositioningEnabled}
              defaultPosition={defaultImagePosition}
            />
            
            <div className="flex gap-8">
              <div className="">
                <label className="" htmlFor="name">
                  Name
                </label>
                <input type="text" name="name" maxLength={12} size={12} />
              </div>
              <div>
                <label className="" htmlFor="hp">
                  HP
                </label>
                <select name="hp" id="hp">
                  <option value="30">30</option>
                  <option value="40">40</option>
                  <option value="50">50</option>
                  <option value="60">60</option>
                  <option value="70">70</option>
                  <option value="80">80</option>
                  <option value="90">90</option>
                  <option value="100">100</option>
                  <option value="110">110</option>
                  <option value="120">120</option>
                </select>
              </div>
            </div>
            <div className="flex gap-8">
              <div>
                <label htmlFor="desc-type">Descriptive Type</label>
                <input type="text" name="desc-type" maxLength={10} size={12} />
              </div>
              <div className="">
                <label className="" htmlFor="type">
                  Energy Type
                </label>
                <select name="type" id="type">
                  <option value="colorless">🕊️ Colorless</option>
                  <option value="fire">️‍🔥 Fire</option>
                  <option value="water">🌊 Water</option>
                  <option value="grass">🌱 Grass</option>
                  <option value="lightning">⚡ Lightning</option>
                  <option value="psychic">🔮 Psychic</option>
                  <option value="fighting">🥊 Fighting</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="length">Length</label>
              <div className="flex gap-4">
                <input
                  type="range"
                  name="length-feet"
                  min="1"
                  max="360"
                  value={lengthSlider}
                  onChange={handleLengthSlider}
                  className="w-3/4"
                />
                <span className="font-bold italic mx-auto">{lengthValue}</span>
              </div>
            </div>
            <div>
              <label htmlFor="weight">Weight</label>
              <div className="flex gap-4">
                <input
                  type="range"
                  name="weight"
                  min="1"
                  max="592"
                  value={weightSlider}
                  onChange={handleWeightSlider}
                  className="w-3/4"
                />
                <span className="font-bold italic mx-auto">
                  {weightValue} lbs
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="flavor-text">Flavor Text</label>
              <textarea name="flavor-text" rows={3} maxLength={120} cols={30} />
            </div>
          </div>

          <div className="flex flex-col gap-5 border-l-zinc-300 border-opacity-40 border-l-2 pl-12">
            <div className="bg-zinc-300 bg-opacity-30 rounded-xl pb-6 pt-4 px-8">
              <label className="italic text-orange-400 w-full text-center">
                ~ First Attack ~
              </label>
              <div className="flex gap-8">
                <div>
                  <label className="" htmlFor="move1name">
                    Name
                  </label>
                  <input type="text" name="move1name" maxLength={12} />
                </div>
                <div>
                  <label className="" htmlFor="move1dmg">
                    Dmg
                  </label>
                  <select name="move1dmg" id="move1dmg">
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                    <option value="60">60</option>
                    <option value="70">70</option>
                    <option value="80">80</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-zinc-300 bg-opacity-30 rounded-xl pb-6 pt-4 px-8">
              <label className="italic text-rose-400 w-full text-center">
                ~ Second Attack ~
              </label>
              <div className="flex gap-8">
                <div>
                  <label className="" htmlFor="move2name">
                    Name
                  </label>
                  <input type="text" name="move2name" maxLength={12} />
                </div>
                <div>
                  <label className="" htmlFor="move2dmg">
                    Dmg
                  </label>
                  <select name="move2dmg" id="move2dmg">
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="40">40</option>
                    <option value="50">50</option>
                    <option value="60">60</option>
                    <option value="70">70</option>
                    <option value="80">80</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-8">
              <div>
                <label className="" htmlFor="weakness">
                  Weakness
                </label>
                <select name="weakness" id="weakness">
                  <option value="fire">️‍🔥 Fire</option>
                  <option value="water">🌊 Water</option>
                  <option value="grass">🌱 Grass</option>
                  <option value="lightning">⚡ Lightning</option>
                  <option value="psychic">🔮 Psychic</option>
                  <option value="fighting">🥊 Fighting</option>
                </select>
              </div>
              <div>
                <label className="" htmlFor="resistance">
                  Resistance
                </label>
                <select name="resistance" id="resistance">
                  <option value="fire">️‍🔥 Fire</option>
                  <option value="water">🌊 Water</option>
                  <option value="grass">🌱 Grass</option>
                  <option value="lightning">⚡ Lightning</option>
                  <option value="psychic">🔮 Psychic</option>
                  <option value="fighting">🥊 Fighting</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="retreat-cost">Retreat Cost</label>
              <select
                name="retreat-cost"
                id="retreat-cost"
                className="text-center"
              >
                <option value="0" className="pr-4">
                  none
                </option>
                <option value="1" className="">
                  ✴️
                </option>
                <option value="2" className="">
                  ✴️ ✴️
                </option>
                <option value="3" className="">
                  ✴️ ✴️ ✴️
                </option>
              </select>
            </div>
            <button className="mt-2" onClick={handleDownload} disabled={!output || isGenerating}>
              {isGenerating ? "Generating..." : "Download Card"}
            </button>
          </div>
        </form>
      <div className="w-[38%] rounded-3xl min-h-0 bg-slate-700 bg-opacity-40 p-5 relative flex items-center justify-center">
          {!output || isGenerating ? (
            <div className="flex flex-col justify-center items-center h-full min-h-[500px]">
              <p className="text-4xl mb-20 font-medium text-zinc-100">
                {isGenerating ? "Generating" : "Loading"}
              </p>
              <DotLoader size={100} color={"#2f2e2e"} />
            </div>
          ) : (
            <div className="relative w-fit h-fit">
              <Image src={output} alt="poke" height={500} width={500} className="rounded-lg" />
              <ImagePositionOverlay
                position={imagePosition}
                onPositionChange={setImagePosition}
                isEnabled={positioningEnabled}
                cardWidth={500}
                cardHeight={500}
                imageFile={file}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
