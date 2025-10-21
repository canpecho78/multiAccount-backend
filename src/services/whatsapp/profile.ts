import { Media } from "../../models/Media";

export async function getProfilePictureUsingSock(sock: any, sessionId: string, jid: string): Promise<string | null> {
  try {
    // Cache en Media como profile-pic
    const existing = await Media.findOne({
      sessionId,
      chatId: jid,
      mediaType: "profile-pic",
    }).sort({ createdAt: -1 });

    if (existing && (Date.now() - existing.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
      return existing.fileId;
    }

    const profilePicUrl = await sock.profilePictureUrl(jid, "image");
    if (!profilePicUrl) return null;

    const response = await fetch(profilePicUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileId = `profile_${jid.replace(/[@:.]/g, "_")}_${Date.now()}`;

    await Media.create({
      fileId,
      messageId: `profile_${jid}`,
      sessionId,
      chatId: jid,
      mediaType: "profile-pic",
      filename: `${fileId}.jpg`,
      mimetype: "image/jpeg",
      size: buffer.length,
      data: buffer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return fileId;
  } catch (error) {
    console.error(`Error getting profile picture for ${jid}:`, error);
    return null;
  }
}
