import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  type User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

/**
 * Servicio de Integración Oficial con Google Drive API v3 (Google Workspace)
 * Almacenamiento y respaldo automatizado en la nube para Imperio Pro
 * Cumple con Least Privilege Principle y directrices de seguridad de Workspace.
 */

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const driveProvider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => {
  driveProvider.addScope(scope);
});

// Parámetros adicionales para asegurar consentimiento y selección de cuenta
driveProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// Token de acceso OAuth cacheado exclusivamente en memoria (NO localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  folderId: string;
  folderName: string;
  webViewLink?: string;
  size: number;
  timestamp: string;
}

/**
 * Inicializa el observador del estado de autenticación.
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Inicia sesión interactiva con Google Drive mediante Popup oficial.
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso OAuth para Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al autenticar con Google Drive:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Obtiene el token de acceso actual en memoria.
 */
export const getDriveAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Cierra la sesión y purga el token de memoria.
 */
export const signOutGoogleDrive = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Obtiene el usuario autenticado actualmente en Firebase Auth.
 */
export const getCurrentDriveUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Busca o crea una carpeta en la raíz del Google Drive del usuario.
 */
export const getOrCreateDriveFolder = async (
  folderName: string = 'ImperioPro_Backups'
): Promise<string> => {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('No autenticado en Google Drive. Se requiere autorización previa.');
  }

  // 1. Buscar si la carpeta ya existe
  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Error al buscar carpeta en Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Si no existe, crear la carpeta
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Carpeta oficial de copias de seguridad de Imperio Pro ERP Contabilidad y Facturación',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error al crear carpeta en Google Drive: ${errText}`);
  }

  const createData = await createRes.json();
  return createData.id;
};

/**
 * Sube un archivo JSON de respaldo a Google Drive usando carga multipart.
 */
export const uploadBackupToGoogleDrive = async (
  backupPayload: any,
  filename?: string,
  folderName: string = 'ImperioPro_Backups'
): Promise<DriveUploadResult> => {
  const token = await getDriveAccessToken();
  if (!token) {
    throw new Error('Debes autorizar el acceso a Google Drive antes de subir el respaldo.');
  }

  const targetFolderId = await getOrCreateDriveFolder(folderName);
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const finalFileName = filename || `ImperioPro_Respaldo_${dateStr}.json`;

  const jsonContent = typeof backupPayload === 'string' 
    ? backupPayload 
    : JSON.stringify(backupPayload, null, 2);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: finalFileName,
    mimeType: 'application/json',
    parents: [targetFolderId],
    description: `Copia de seguridad generada automáticamente por Imperio Pro ERP el ${now.toLocaleString('es-PA')}`,
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Error al subir archivo a Google Drive: ${errText}`);
  }

  const uploadData = await uploadRes.json();

  return {
    fileId: uploadData.id,
    fileName: uploadData.name || finalFileName,
    folderId: targetFolderId,
    folderName,
    webViewLink: uploadData.webViewLink,
    size: new Blob([jsonContent]).size,
    timestamp: now.toISOString(),
  };
};

/**
 * Lista los archivos de respaldo existentes en la carpeta de Google Drive.
 */
export const listDriveBackups = async (
  folderName: string = 'ImperioPro_Backups'
): Promise<DriveFileInfo[]> => {
  const token = await getDriveAccessToken();
  if (!token) return [];

  try {
    const folderId = await getOrCreateDriveFolder(folderName);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)&orderBy=createdTime desc&pageSize=20`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      console.warn('No se pudieron listar los archivos de Drive:', await res.text());
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Error al consultar archivos en Drive:', err);
    return [];
  }
};
