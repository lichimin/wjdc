
import { GoogleGenAI } from "@google/genai";
import { Room, ItemType } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("No API_KEY found in environment.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateRoomDescription = async (room: Room): Promise<string> => {
  const ai = getClient();
  if (!ai) {
    return "The mists of the dungeon obscure the details... (Missing API Key)";
  }

  // Construct a prompt based on room data
  const itemCount = room.items.length;
  const tables = room.items.filter(i => i.type === ItemType.TABLE).length;
  const chairs = room.items.filter(i => i.type === ItemType.CHAIR).length;
  const decorations = room.items.filter(i => i.type === ItemType.DECORATION).length;
  const bookshelves = room.items.filter(i => i.type === ItemType.BOOKSHELF).length;
  const weaponRacks = room.items.filter(i => i.type === ItemType.WEAPON_RACK).length;
  const altars = room.items.filter(i => i.type === ItemType.ALTAR).length;
  const chests = room.items.filter(i => i.type === ItemType.CHEST).length;

  const prompt = `
    You are a dungeon master for a retro pixel-art RPG.
    Describe a room with the following contents in a spooky, mysterious tone.
    The description should be short (max 2 sentences).
    
    Room Theme: ${room.theme || 'Unknown'}
    Room Data:
    - Size: ${room.w}x${room.h} tiles.
    - Furniture: ${tables} tables, ${chairs} chairs.
    - Specialized: ${bookshelves} bookshelves, ${weaponRacks} weapon racks, ${altars} altars.
    - Loot/Decor: ${chests} chests, ${decorations} vases/artifacts.
    
    If the room is empty, describe the dust and emptiness.
    Do not mention pixel art or tiles directly, describe the atmosphere.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "A silent room.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "A strange magical interference prevents you from inspecting this room.";
  }
};
