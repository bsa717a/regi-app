import type { RegistrationPhoto } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PHOTO_READ_URL_TTL_MS,
  validatePhotoGcsPath,
} from "@/lib/registrations/photo";
import { createDownloadSignedUrl, deleteObject } from "@/lib/storage/gcs";
import type { RegistrationPhotoDto } from "@/lib/registrations/types";
import { MAX_REGISTRATION_PHOTOS } from "@/lib/registrations/photoConstants";

export { MAX_REGISTRATION_PHOTOS };

export async function countRegistrationPhotos(
  registrationId: string,
): Promise<number> {
  return prisma.registrationPhoto.count({ where: { registrationId } });
}

export async function loadRegistrationPhotos(
  registrationId: string,
): Promise<RegistrationPhoto[]> {
  return prisma.registrationPhoto.findMany({
    where: { registrationId },
    orderBy: [
      { isCover: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });
}

export async function loadRegistrationPhotosForMany(
  registrationIds: string[],
): Promise<Map<string, RegistrationPhoto[]>> {
  if (registrationIds.length === 0) return new Map();

  const rows = await prisma.registrationPhoto.findMany({
    where: { registrationId: { in: registrationIds } },
    orderBy: [
      { isCover: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });

  const grouped = new Map<string, RegistrationPhoto[]>();
  for (const row of rows) {
    const list = grouped.get(row.registrationId) ?? [];
    list.push(row);
    grouped.set(row.registrationId, list);
  }
  return grouped;
}

async function signedPhotoUrl(gcsPath: string): Promise<string | null> {
  try {
    const signed = await createDownloadSignedUrl({
      gcsPath,
      ttlMs: PHOTO_READ_URL_TTL_MS,
    });
    return signed.downloadUrl;
  } catch {
    return null;
  }
}

export async function serializeRegistrationPhotos(
  photos: RegistrationPhoto[],
): Promise<RegistrationPhotoDto[]> {
  return Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      isCover: photo.isCover,
      sortOrder: photo.sortOrder,
      url: (await signedPhotoUrl(photo.gcsPath)) ?? "",
    })),
  );
}

export function coverPhotoGcsPath(photos: RegistrationPhoto[]): string | null {
  const cover = photos.find((photo) => photo.isCover);
  if (cover) return cover.gcsPath;
  return photos[0]?.gcsPath ?? null;
}

/** Keep legacy photoGcsPath in sync with the cover photo row. */
export async function syncRegistrationCoverPhoto(
  registrationId: string,
): Promise<void> {
  const photos = await loadRegistrationPhotos(registrationId);
  const gcsPath = coverPhotoGcsPath(photos);

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      photoGcsPath: gcsPath,
      photoUrl: null,
    },
  });
}

export async function addRegistrationPhoto(input: {
  registrationId: string;
  householdId: string;
  gcsPath: string;
}): Promise<RegistrationPhoto> {
  if (
    !validatePhotoGcsPath(input.gcsPath, {
      householdId: input.householdId,
      registrationId: input.registrationId,
    })
  ) {
    throw new Error("Invalid photo path");
  }

  const duplicate = await prisma.registrationPhoto.findFirst({
    where: {
      registrationId: input.registrationId,
      gcsPath: input.gcsPath,
    },
  });
  if (duplicate) return duplicate;

  const existingCount = await countRegistrationPhotos(input.registrationId);
  if (existingCount >= MAX_REGISTRATION_PHOTOS) {
    throw new Error("PHOTO_LIMIT");
  }

  const isFirst = existingCount === 0;
  const maxSort = await prisma.registrationPhoto.aggregate({
    where: { registrationId: input.registrationId },
    _max: { sortOrder: true },
  });

  const photo = await prisma.registrationPhoto.create({
    data: {
      registrationId: input.registrationId,
      gcsPath: input.gcsPath,
      isCover: isFirst,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  if (isFirst || photo.isCover) {
    await syncRegistrationCoverPhoto(input.registrationId);
  }

  return photo;
}

export async function deleteRegistrationPhotoById(input: {
  registrationId: string;
  photoId: string;
}): Promise<void> {
  const photo = await prisma.registrationPhoto.findFirst({
    where: {
      id: input.photoId,
      registrationId: input.registrationId,
    },
  });

  if (!photo) {
    throw new Error("NOT_FOUND");
  }

  try {
    await deleteObject(photo.gcsPath);
  } catch {
    throw new Error("DELETE_FAILED");
  }

  const wasCover = photo.isCover;
  await prisma.registrationPhoto.delete({ where: { id: photo.id } });

  if (wasCover) {
    const remaining = await loadRegistrationPhotos(input.registrationId);
    if (remaining.length > 0) {
      await prisma.registrationPhoto.update({
        where: { id: remaining[0]!.id },
        data: { isCover: true },
      });
    }
  }

  await syncRegistrationCoverPhoto(input.registrationId);
}

export async function setRegistrationCoverPhoto(input: {
  registrationId: string;
  photoId: string;
}): Promise<void> {
  const photo = await prisma.registrationPhoto.findFirst({
    where: {
      id: input.photoId,
      registrationId: input.registrationId,
    },
  });

  if (!photo) {
    throw new Error("NOT_FOUND");
  }

  await prisma.$transaction([
    prisma.registrationPhoto.updateMany({
      where: { registrationId: input.registrationId },
      data: { isCover: false },
    }),
    prisma.registrationPhoto.update({
      where: { id: photo.id },
      data: { isCover: true },
    }),
  ]);

  await syncRegistrationCoverPhoto(input.registrationId);
}

export async function syncRegistrationPhotos(input: {
  registrationId: string;
  householdId: string;
  deletePhotoIds: string[];
  addGcsPaths: string[];
  coverPhotoId?: string | null;
  coverAddIndex?: number | null;
}): Promise<void> {
  const deleteIds = [...new Set(input.deletePhotoIds)];
  const addPaths = [...new Set(input.addGcsPaths)];

  for (const gcsPath of addPaths) {
    if (
      !validatePhotoGcsPath(gcsPath, {
        householdId: input.householdId,
        registrationId: input.registrationId,
      })
    ) {
      throw new Error("Invalid photo path");
    }
  }

  const current = await loadRegistrationPhotos(input.registrationId);
  const deleting = current.filter((photo) => deleteIds.includes(photo.id));
  if (deleting.length !== deleteIds.length) {
    throw new Error("NOT_FOUND");
  }

  const remainingAfterDelete = current.filter(
    (photo) => !deleteIds.includes(photo.id),
  );
  const newAdds = addPaths.filter(
    (gcsPath) => !remainingAfterDelete.some((photo) => photo.gcsPath === gcsPath),
  );

  if (remainingAfterDelete.length + newAdds.length > MAX_REGISTRATION_PHOTOS) {
    throw new Error("PHOTO_LIMIT");
  }

  const gcsPathsToDelete = deleting.map((photo) => photo.gcsPath);
  const addedPhotoIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (deleteIds.length > 0) {
      await tx.registrationPhoto.deleteMany({
        where: {
          registrationId: input.registrationId,
          id: { in: deleteIds },
        },
      });
    }

    let sortOrder =
      remainingAfterDelete.reduce(
        (max, photo) => Math.max(max, photo.sortOrder),
        -1,
      ) + 1;

    for (const gcsPath of addPaths) {
      const existing = await tx.registrationPhoto.findFirst({
        where: { registrationId: input.registrationId, gcsPath },
      });
      if (existing) {
        addedPhotoIds.push(existing.id);
        continue;
      }

      const isFirst =
        remainingAfterDelete.length === 0 && addedPhotoIds.length === 0;
      const created = await tx.registrationPhoto.create({
        data: {
          registrationId: input.registrationId,
          gcsPath,
          isCover: isFirst,
          sortOrder: sortOrder++,
        },
      });
      addedPhotoIds.push(created.id);
    }

    let coverId = input.coverPhotoId ?? null;
    if (input.coverAddIndex != null) {
      coverId = addedPhotoIds[input.coverAddIndex] ?? coverId;
    }

    if (coverId) {
      const coverExists = await tx.registrationPhoto.findFirst({
        where: { id: coverId, registrationId: input.registrationId },
      });
      if (!coverExists) {
        throw new Error("NOT_FOUND");
      }

      await tx.registrationPhoto.updateMany({
        where: { registrationId: input.registrationId },
        data: { isCover: false },
      });
      await tx.registrationPhoto.update({
        where: { id: coverId },
        data: { isCover: true },
      });
    } else if (deleteIds.length > 0) {
      const remaining = await tx.registrationPhoto.findMany({
        where: { registrationId: input.registrationId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      if (remaining.length > 0 && !remaining.some((photo) => photo.isCover)) {
        await tx.registrationPhoto.update({
          where: { id: remaining[0]!.id },
          data: { isCover: true },
        });
      }
    }
  });

  for (const gcsPath of gcsPathsToDelete) {
    try {
      await deleteObject(gcsPath);
    } catch {
      // Best-effort storage cleanup after the DB transaction commits.
    }
  }

  await syncRegistrationCoverPhoto(input.registrationId);
}
