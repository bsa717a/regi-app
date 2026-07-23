"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { DocumentType } from "@prisma/client";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  labelClassName,
  primaryButtonClassName,
  selectClassName,
} from "@/components/auth/AuthFormStyles";
import { AppShell } from "@/components/shell/AppShell";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import {
  ApiError,
  deleteDocument,
  getDocumentDownloadUrl,
  listDocuments,
  listRegistrations,
  updateDocument,
} from "@/lib/api/client";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/documents/constants";
import { uploadDocumentToVault } from "@/lib/documents/clientUpload";
import type { DocumentDto } from "@/lib/documents/types";
import { REGISTRATION_TYPE_LABELS } from "@/lib/registrations/illustrations";
import type { RegistrationDto } from "@/lib/registrations/types";

const ALL_REGISTRATIONS = "";

function vehicleLabel(vehicle: RegistrationDto): string {
  if (vehicle.nickname?.trim()) return vehicle.nickname.trim();
  const parts = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");
  if (parts) return parts;
  if (vehicle.plate?.trim()) return vehicle.plate.trim();
  if (vehicle.vin?.trim()) {
    const vin = vehicle.vin.trim();
    return vin.length > 8 ? `VIN …${vin.slice(-6)}` : `VIN ${vin}`;
  }
  return REGISTRATION_TYPE_LABELS[vehicle.type];
}

function documentTileLabel(
  doc: DocumentDto,
  vehicle: RegistrationDto | undefined,
): string {
  const typeLabel = DOCUMENT_TYPE_LABELS[doc.type];
  if (!vehicle) return typeLabel;
  return `${typeLabel} for ${vehicleLabel(vehicle)}`;
}

function formatUploadedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function DocumentsClient() {
  const { idToken, getIdToken, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<RegistrationDto[]>([]);
  const [filterVehicleId, setFilterVehicleId] = useState(ALL_REGISTRATIONS);
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentDto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );

  const editableVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.canEdit),
    [vehicles],
  );

  const filteredDocuments = useMemo(() => {
    if (!filterVehicleId) return documents;
    return documents.filter((doc) => doc.registrationId === filterVehicleId);
  }, [documents, filterVehicleId]);

  const filteredVehicle = filterVehicleId
    ? (vehicleById.get(filterVehicleId) ?? null)
    : null;

  async function loadPreview(doc: DocumentDto) {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewFilename(doc.originalFilename);

    try {
      const token = idToken ?? (await getIdToken());
      if (!token) throw new ApiError("Not signed in", 401);
      const signed = await getDocumentDownloadUrl(token, doc.id);
      setPreviewUrl(signed.downloadUrl);
      setPreviewFilename(signed.filename || doc.originalFilename);
    } catch (err) {
      setPreviewError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not load document preview.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewDoc(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewFilename("");
  }

  async function renamePreviewDocument(nextFilename: string) {
    if (!previewDoc) return;
    const token = idToken ?? (await getIdToken());
    if (!token) throw new ApiError("Not signed in", 401);
    const updated = await updateDocument(token, previewDoc.id, {
      originalFilename: nextFilename,
    });
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === updated.id ? updated : doc)),
    );
    setPreviewDoc(updated);
    setPreviewFilename(updated.originalFilename);
  }

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function run() {
      try {
        const token = idToken ?? (await getIdToken());
        if (!token) {
          if (!cancelled) {
            setVehicles([]);
            setLoadingVehicles(false);
          }
          return;
        }
        const rows = await listRegistrations(token);
        if (!cancelled) {
          setVehicles(rows);
          setError(null);
          setLoadingVehicles(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load your registrations.",
          );
          setLoadingVehicles(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, idToken, getIdToken, reloadKey]);

  useEffect(() => {
    if (authLoading || vehicles.length === 0) return;

    let cancelled = false;

    async function run() {
      if (!cancelled) setLoadingDocs(true);

      try {
        const token = idToken ?? (await getIdToken());
        if (!token) {
          if (!cancelled) {
            setDocuments([]);
            setLoadingDocs(false);
          }
          return;
        }

        const results = await Promise.allSettled(
          vehicles.map((vehicle) => listDocuments(token, vehicle.id)),
        );
        const rows = results
          .flatMap((result) =>
            result.status === "fulfilled" ? result.value : [],
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        const failedLoads = results.filter(
          (result) => result.status === "rejected",
        ).length;

        if (!cancelled) {
          setDocuments(rows);
          if (failedLoads > 0 && rows.length === 0) {
            setError("Could not load documents.");
          } else if (failedLoads > 0) {
            setError(
              `Some documents could not be loaded (${failedLoads} registration${failedLoads === 1 ? "" : "s"}).`,
            );
          } else {
            setError(null);
          }
          setLoadingDocs(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load documents.",
          );
          setLoadingDocs(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, idToken, getIdToken, vehicles, reloadKey]);

  const previewVehicle = previewDoc
    ? vehicleById.get(previewDoc.registrationId)
    : undefined;

  return (
    <AppShell
      title="Documents"
      action={
        editableVehicles.length > 0 ? (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-xl bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Upload
          </button>
        ) : undefined
      }
    >
      {loadingVehicles ? (
        <div className="space-y-4" aria-busy aria-label="Loading document vault">
          <div className="h-11 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : null}

      {!loadingVehicles && error && vehicles.length === 0 ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-5">
          <p className="font-medium text-rose-900">{error}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-rose-800 underline-offset-4 hover:underline"
            onClick={() => {
              setLoadingVehicles(true);
              setReloadKey((k) => k + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {!loadingVehicles && vehicles.length === 0 && !error ? (
        <section className="flex min-h-[55vh] flex-col justify-center">
          <p className="text-sm font-medium text-teal-800">Document vault</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Add a registration first
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600">
            Registration cards, insurance, and titles live with each
            registration in your garage.
          </p>
          <a href="/garage" className={`${primaryButtonClassName} mt-8`}>
            Go to garage
          </a>
        </section>
      ) : null}

      {!loadingVehicles && vehicles.length > 0 ? (
        <div className="space-y-5">
          <div>
            <label htmlFor="vault-vehicle-filter" className={labelClassName}>
              Filter by registration
            </label>
            <select
              id="vault-vehicle-filter"
              className={selectClassName}
              value={filterVehicleId}
              onChange={(e) => setFilterVehicleId(e.target.value)}
            >
              <option value={ALL_REGISTRATIONS}>All registrations</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
            >
              {error}
            </div>
          ) : null}

          {loadingDocs ? (
            <div className="space-y-3" aria-busy aria-label="Loading documents">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-3xl bg-slate-100"
                />
              ))}
            </div>
          ) : (
            <>
              {filteredVehicle && !filteredVehicle.canEdit ? (
                <p
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  role="status"
                >
                  Shared registration · view and download only. Ask the
                  household owner to upload or delete documents.
                </p>
              ) : null}

              <DocumentList
                documents={filteredDocuments}
                vehicleById={vehicleById}
                hasEditableVehicle={editableVehicles.length > 0}
                onView={(doc) => void loadPreview(doc)}
                onDownload={async (doc) => {
                  const token = idToken ?? (await getIdToken());
                  if (!token) throw new ApiError("Not signed in", 401);
                  const { downloadUrl } = await getDocumentDownloadUrl(
                    token,
                    doc.id,
                  );
                  window.open(downloadUrl, "_blank", "noopener,noreferrer");
                }}
                onDelete={async (doc) => {
                  const token = idToken ?? (await getIdToken());
                  if (!token) throw new ApiError("Not signed in", 401);
                  await deleteDocument(token, doc.id);
                  setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                }}
                onUploadClick={() => setUploadOpen(true)}
                filterActive={Boolean(filterVehicleId)}
              />
            </>
          )}
        </div>
      ) : null}

      {uploadOpen && editableVehicles.length > 0 ? (
        <UploadSheet
          vehicles={editableVehicles}
          initialVehicleId={
            filterVehicleId && vehicleById.get(filterVehicleId)?.canEdit
              ? filterVehicleId
              : editableVehicles[0]?.id
          }
          onClose={() => setUploadOpen(false)}
          onUploaded={(doc) => {
            setDocuments((prev) =>
              [doc, ...prev].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              ),
            );
            setUploadOpen(false);
          }}
          getToken={async () => idToken ?? (await getIdToken())}
        />
      ) : null}

      {previewDoc ? (
        <DocumentPreviewModal
          open
          onClose={closePreview}
          categoryLabel={documentTileLabel(
            previewDoc,
            previewVehicle,
          )}
          title={previewFilename || previewDoc.originalFilename}
          filename={previewFilename || previewDoc.originalFilename}
          downloadUrl={previewUrl}
          loading={previewLoading}
          error={previewError}
          onRetry={() => void loadPreview(previewDoc)}
          canRename={Boolean(previewVehicle?.canEdit)}
          onRename={
            previewVehicle?.canEdit
              ? async (nextFilename) => {
                  try {
                    await renamePreviewDocument(nextFilename);
                  } catch (err) {
                    throw err instanceof ApiError
                      ? err
                      : new Error("Could not rename document.");
                  }
                }
              : undefined
          }
        />
      ) : null}
    </AppShell>
  );
}

function DocumentList({
  documents,
  vehicleById,
  hasEditableVehicle,
  onView,
  onDownload,
  onDelete,
  onUploadClick,
  filterActive,
}: {
  documents: DocumentDto[];
  vehicleById: Map<string, RegistrationDto>;
  hasEditableVehicle: boolean;
  onView: (doc: DocumentDto) => void;
  onDownload: (doc: DocumentDto) => Promise<void>;
  onDelete: (doc: DocumentDto) => Promise<void>;
  onUploadClick: () => void;
  filterActive: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (documents.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-teal-200/80 bg-white/70 px-5 py-10 text-center">
        <p className="text-sm font-medium text-teal-800">Empty vault</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {filterActive ? "No documents for this registration" : "No documents yet"}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-slate-600">
          {hasEditableVehicle
            ? "Upload a registration card, insurance, title, emissions certificate, temporary permit, or other document. Files stay private — downloads use short-lived links."
            : filterActive
              ? "No documents yet for this shared registration. The household owner can upload files here."
              : "No documents in your vault yet."}
        </p>
        {hasEditableVehicle ? (
          <button
            type="button"
            className={`${primaryButtonClassName} mt-8`}
            onClick={onUploadClick}
          >
            Upload a document
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {documents.length} document{documents.length === 1 ? "" : "s"} ·
        private storage
      </p>
      {actionError ? (
        <p role="alert" className="text-sm text-rose-700">
          {actionError}
        </p>
      ) : null}
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white">
        <ul className="divide-y divide-slate-100">
          {documents.map((doc) => {
            const vehicle = vehicleById.get(doc.registrationId);
            const canEdit = Boolean(vehicle?.canEdit);

            return (
              <li
                key={doc.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
                    {documentTileLabel(doc, vehicle)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onView(doc)}
                    className="mt-1 max-w-full truncate text-left text-base font-medium text-slate-900 underline-offset-4 hover:text-teal-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  >
                    {doc.originalFilename}
                  </button>
                  <p className="mt-1 text-sm text-slate-500">
                    Uploaded {formatUploadedAt(doc.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === doc.id}
                    className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
                    onClick={() => onView(doc)}
                  >
                    {canEdit ? "View/rename" : "View"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === doc.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
                    onClick={async () => {
                      setActionError(null);
                      setBusyId(doc.id);
                      try {
                        await onDownload(doc);
                      } catch (err) {
                        setActionError(
                          err instanceof ApiError
                            ? err.message
                            : "Download failed.",
                        );
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Download
                  </button>
                  {canEdit ? (
                    <button
                      type="button"
                      disabled={busyId === doc.id}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:opacity-60"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Delete “${doc.originalFilename}”? This cannot be undone.`,
                          )
                        ) {
                          return;
                        }
                        setActionError(null);
                        setBusyId(doc.id);
                        try {
                          await onDelete(doc);
                        } catch (err) {
                          setActionError(
                            err instanceof ApiError
                              ? err.message
                              : "Delete failed.",
                          );
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function UploadSheet({
  vehicles,
  initialVehicleId,
  onClose,
  onUploaded,
  getToken,
}: {
  vehicles: RegistrationDto[];
  initialVehicleId?: string;
  onClose: () => void;
  onUploaded: (doc: DocumentDto) => void;
  getToken: () => Promise<string | null>;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [vehicleId, setVehicleId] = useState(
    initialVehicleId ?? vehicles[0]?.id ?? "",
  );
  const [type, setType] = useState<DocumentType>("registration");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const vehicle = vehicles.find((row) => row.id === vehicleId) ?? vehicles[0];

  function acceptFile(next: File | null | undefined) {
    if (!next) return;
    setError(null);
    setFile(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!vehicle) {
      setError("Choose a registration to upload to.");
      return;
    }
    if (!file) {
      setError("Choose a photo or PDF to upload.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setProgress(0);

    try {
      const token = await getToken();
      if (!token) throw new ApiError("Not signed in", 401);

      const doc = await uploadDocumentToVault({
        token,
        registrationId: vehicle.id,
        type,
        file,
        onProgress: setProgress,
      });
      onUploaded(doc);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Upload failed. Please try again.",
      );
      setProgress(null);
    } finally {
      setSubmitting(false);
    }
  }

  const maxMb = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl">
        <form onSubmit={handleSubmit} className="px-5 pb-6 pt-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
                Upload
              </p>
              <h2
                id={titleId}
                className="mt-1 text-xl font-semibold tracking-tight text-slate-900"
              >
                Document vault
              </h2>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Close
            </button>
          </div>

          {vehicles.length > 1 ? (
            <>
              <label htmlFor="upload-vehicle" className={labelClassName}>
                Registration
              </label>
              <select
                id="upload-vehicle"
                className={selectClassName}
                value={vehicleId}
                disabled={submitting}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                {vehicles.map((row) => (
                  <option key={row.id} value={row.id}>
                    {vehicleLabel(row)}
                  </option>
                ))}
              </select>
            </>
          ) : vehicle ? (
            <p className="text-sm text-slate-600">
              For {vehicleLabel(vehicle)}
            </p>
          ) : null}

          <label htmlFor="doc-type" className={`${labelClassName} mt-5`}>
            Document type
          </label>
          <select
            id="doc-type"
            className={selectClassName}
            value={type}
            disabled={submitting}
            onChange={(e) => setType(e.target.value as DocumentType)}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <div
            className={`mt-5 rounded-3xl border-2 border-dashed px-4 py-8 text-center transition ${
              dragOver
                ? "border-teal-600 bg-teal-50"
                : "border-slate-200 bg-slate-50/80"
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
          >
            <p className="text-base font-medium text-slate-900">
              {file ? file.name : "Photo or PDF"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              JPEG, PNG, WebP, HEIC, or PDF · up to {maxMb} MB
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                disabled={submitting}
                className="rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60"
                onClick={() => inputRef.current?.click()}
              >
                Choose file
              </button>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-700">
                Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={submitting}
                  onChange={(e) => acceptFile(e.target.files?.[0])}
                />
              </label>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="sr-only"
              disabled={submitting}
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
          </div>

          {progress !== null ? (
            <div className="mt-5" aria-live="polite">
              <div className="mb-1 flex justify-between text-sm text-slate-600">
                <span>Uploading</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-teal-600 transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !file || !vehicle}
            className={`${primaryButtonClassName} mt-6`}
          >
            {submitting ? "Uploading…" : "Upload to vault"}
          </button>
        </form>
      </div>
    </div>
  );
}
