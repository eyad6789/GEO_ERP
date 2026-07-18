// Employee avatar/photo helpers. A photo is stored as an employee_documents row
// of doc_type 'PHOTO' (base64 upload); the newest PHOTO wins. Shared by the
// profile header camera and the avatar uploader inside the edit dialogs.
import { apiDelete, apiPost } from '@/lib/api'

/** Read a File as a data: URL (base64) for the /employee-documents upload. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error ?? new Error('read failed'))
    r.readAsDataURL(file)
  })
}

/**
 * Upload a new PHOTO document for an employee, then delete the previous one.
 * Upload FIRST so a failed POST never loses the old photo (best-effort delete).
 */
export async function uploadEmployeePhoto(
  employeeId: string,
  file: File,
  title: string,
  existingPhotoDocId?: string,
): Promise<void> {
  const data = await readFileAsDataUrl(file)
  await apiPost('/employee-documents', {
    employee_id: employeeId,
    doc_type: 'PHOTO',
    title,
    file_name: file.name,
    mime: file.type || 'image/jpeg',
    data,
  })
  if (existingPhotoDocId) await apiDelete(`/employee-documents/${existingPhotoDocId}`).catch(() => undefined)
}

/** Remove an employee's current photo document. */
export async function deleteEmployeePhoto(photoDocId: string): Promise<void> {
  await apiDelete(`/employee-documents/${photoDocId}`)
}
