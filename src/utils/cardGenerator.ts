import { HorizontalAlign, Jimp, loadFont, VerticalAlign, rgbaToInt } from "jimp";

export interface PokemonCardData {
  name: string;
  type: string;
  descType: string;
  flavorText: string;
  hp: string;
  move1name: string;
  move1dmg: string;
  move2name: string;
  move2dmg: string;
  weakness: string;
  resistance: string;
  retreatCost: string;
  lengthValue: string;
  weightValue: string;
}

export interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

export class PokemonCardGenerator {
  private static fonts: { [key: string]: any } = {};
  private static images: { [key: string]: any } = {};
  private static assetsLoaded = false;

  // Cache frequently used assets
  static async preloadAssets(): Promise<void> {
    if (this.assetsLoaded) return;
    
    try {
      // Preload fonts
      this.fonts = {
        gillCb44: await loadFont("/fonts/gill-cb-44.fnt"),
        gillCb48: await loadFont("/fonts/gill-cb-48.fnt"),
        gillRp64: await loadFont("/fonts/gill-rp-64.fnt"),
        gillRbi22: await loadFont("/fonts/gill-rbi-22.fnt"),
      };

      // Preload common images
      const imageTypes = ['colorless', 'fire', 'water', 'grass', 'lightning', 'psychic', 'fighting'];
      for (const type of imageTypes) {
        this.images[`energy-large-${type}`] = await Jimp.read(`/poke/energy-large-${type}.png`);
        this.images[`energy-small-${type}`] = await Jimp.read(`/poke/energy-small-${type}.png`);
      }
      
      this.images['energy-colorless'] = await Jimp.read(`/poke/energy-colorless.png`);
      this.images['energy-small-colorless'] = await Jimp.read(`/poke/energy-small-colorless.png`);
      
      this.assetsLoaded = true;
    } catch (error) {
      console.error('Failed to preload assets:', error);
      throw error;
    }
  }

  static async generateCard(
    inputImage: any,
    cardData: PokemonCardData,
    positioning: boolean = false,
    imagePosition?: ImagePosition
  ): Promise<any> {
    // Ensure assets are loaded before generating
    await this.preloadAssets();
    
    // Create base card
    const blank = new Jimp({
      width: 726,
      height: 996,
      color: rgbaToInt(0, 0, 0, 0),
    });
    blank.opacity(0);

    // Load overlay
    const overlay = await Jimp.read(`/poke/${cardData.type}.png`);

    // Handle image positioning
    let processedImage: any;
    if (positioning && imagePosition) {
      // Scale the image while maintaining aspect ratio
      const scale = imagePosition.scale;
      const scaledWidth = Math.floor(inputImage.width * scale);
      const scaledHeight = Math.floor(inputImage.height * scale);
      
      processedImage = inputImage.resize({ w: scaledWidth, h: scaledHeight });
      
      // Create frame-sized canvas - no clipping, just positioning
      const frameWidth = 558;
      const frameHeight = 390;
      const canvas = new Jimp({ width: frameWidth, height: frameHeight, color: rgbaToInt(0, 0, 0, 0) });
      
      // Position the image exactly where the user placed it
      // imagePosition.x and imagePosition.y represent the CENTER point in frame coordinates
      const imageX = Math.floor(imagePosition.x - scaledWidth / 2);
      const imageY = Math.floor(imagePosition.y - scaledHeight / 2);
      
      console.log('Card Generation Debug:', {
        imagePosition,
        scaledWidth,
        scaledHeight,
        imageX,
        imageY,
        scale: imagePosition.scale
      });
      
      // Composite the image - parts outside frame will naturally be clipped by canvas bounds
      canvas.composite(processedImage, imageX, imageY);
      processedImage = canvas;
    } else {
      // Default behavior - fill frame while maintaining aspect ratio
      const frameWidth = 558;
      const frameHeight = 390;
      
      // Calculate scale to fill frame
      const scaleX = frameWidth / inputImage.width;
      const scaleY = frameHeight / inputImage.height;
      const fillScale = Math.max(scaleX, scaleY);
      
      // Scale the image to fill
      const scaledWidth = Math.floor(inputImage.width * fillScale);
      const scaledHeight = Math.floor(inputImage.height * fillScale);
      processedImage = inputImage.resize({ w: scaledWidth, h: scaledHeight });
      
      // Create frame-sized canvas and center the image (overflow will be clipped)
      const canvas = new Jimp({ width: frameWidth, height: frameHeight, color: rgbaToInt(0, 0, 0, 0) });
      const centerX = Math.floor((frameWidth - scaledWidth) / 2);
      const centerY = Math.floor((frameHeight - scaledHeight) / 2);
      
      canvas.composite(processedImage, centerX, centerY);
      processedImage = canvas;
    }

    // Composite background and overlay
    // processedImage is already positioned if using positioning mode
    // For positioning mode, processedImage is the final 558x390 positioned image
    // For non-positioning mode, processedImage is a 558x390 stretched image
    const background = blank.composite(processedImage, 82, 122);
    const card = background.composite(overlay, 0, 0);

    // Add card elements
    await this.addText(card, cardData);
    await this.addImages(card, cardData);

    // Final processing
    card.resize({ w: 363, h: 498 });
    card.resize({ w: 726, h: 996 });

    return card;
  }

  private static async addText(card: any, cardData: PokemonCardData) {
    // Ensure fonts are available
    if (!this.assetsLoaded || !this.fonts.gillCb44 || !this.fonts.gillCb48 || !this.fonts.gillRp64 || !this.fonts.gillRbi22) {
      console.warn('Fonts not loaded, skipping text rendering');
      return;
    }

    const { gillCb44, gillCb48, gillRp64, gillRbi22 } = this.fonts;

    // Name
    card.print({ font: gillCb48, x: 72, y: 60, text: cardData.name });

    // Desc type, height & weight
    card.print({
      font: gillRbi22,
      x: 100,
      y: 529,
      text: {
        text: `${cardData.descType} Pokemon. Length: ${cardData.lengthValue}, Weight: ${cardData.weightValue} lbs.`,
        alignmentX: HorizontalAlign.CENTER,
      },
      maxWidth: 525,
      maxHeight: 30,
    });

    // Flavor text
    card.print({
      font: gillRbi22,
      x: 87,
      y: 877,
      text: {
        text: cardData.flavorText,
        alignmentX: HorizontalAlign.LEFT,
      },
      maxWidth: 590,
      maxHeight: 55,
    });

    // Move 1
    card.print({
      font: gillCb44,
      x: 114,
      y: 600,
      text: {
        text: cardData.move1name,
        alignmentX: HorizontalAlign.CENTER,
        alignmentY: VerticalAlign.MIDDLE,
      },
      maxWidth: 500,
      maxHeight: 50,
    });
    card.print({
      font: gillRp64,
      x: 570,
      y: 600,
      text: {
        text: cardData.move1dmg,
        alignmentX: HorizontalAlign.CENTER,
        alignmentY: VerticalAlign.MIDDLE,
      },
      maxWidth: 100,
      maxHeight: 50,
    });

    // Move 2
    card.print({
      font: gillCb44,
      x: 114,
      y: 700,
      text: {
        text: cardData.move2name,
        alignmentX: HorizontalAlign.CENTER,
        alignmentY: VerticalAlign.MIDDLE,
      },
      maxWidth: 500,
      maxHeight: 50,
    });
    card.print({
      font: gillRp64,
      x: 570,
      y: 700,
      text: {
        text: cardData.move2dmg,
        alignmentX: HorizontalAlign.CENTER,
        alignmentY: VerticalAlign.MIDDLE,
      },
      maxWidth: 100,
      maxHeight: 50,
    });
  }

  private static async addImages(card: any, cardData: PokemonCardData) {
    // HP
    const hp = await Jimp.read(`/poke/hp-${cardData.hp}.png`);
    hp.resize({ w: 118, h: 32 });
    card.composite(hp, 490, 76);

    // Energy types for moves
    const energyType = this.images[`energy-large-${cardData.type}`] || await Jimp.read(`/poke/energy-large-${cardData.type}.png`);
    const energyColorless = this.images['energy-colorless'] || await Jimp.read(`/poke/energy-colorless.png`);

    // Move 1 energy
    card.composite(energyType, 80, 609);

    // Move 2 energy
    card.composite(energyType, 58, 709);
    card.composite(energyColorless, 108, 709);

    // Weakness
    if (cardData.weakness !== "none") {
      const weakness = this.images[`energy-small-${cardData.weakness}`] || await Jimp.read(`/poke/energy-small-${cardData.weakness}.png`);
      card.composite(weakness, 100, 834);
    }

    // Resistance
    if (cardData.resistance !== "none") {
      const resistance = this.images[`energy-small-${cardData.resistance}`] || await Jimp.read(`/poke/energy-small-${cardData.resistance}.png`);
      card.composite(resistance, 340, 834);
    }

    // Retreat cost
    if (cardData.retreatCost && cardData.retreatCost !== "0") {
      const retreat = this.images['energy-small-colorless'] || await Jimp.read(`/poke/energy-small-colorless.png`);
      const cost = parseInt(cardData.retreatCost);
      
      const positions = [
        [580, 834], // 1 energy
        [563, 596], // 2 energies
        [547, 580, 612] // 3 energies
      ];

      if (cost <= 3) {
        const energyPositions = positions[cost - 1];
        energyPositions.forEach(x => {
          card.composite(retreat, x, 834);
        });
      }
    }
  }
} 