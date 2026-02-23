import { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/Lib/Firebase/FirebaseAdmin';
import { createRecordBodySchema, updateRecordBodySchema } from '../Utils/schemas';
import { fail, ok } from '../Utils/response';
import { nonEmptyStringSchema, parseJsonBody } from '../Utils/validation';
import { getErrorMessage } from '../Utils/user';

type RecordMutationResponse = { message: string; recordId?: string };
type RecordData = { id: string; [key: string]: unknown };

function parseRecordId(req: NextRequest): string | null {
  const idResult = nonEmptyStringSchema.safeParse(req.nextUrl.searchParams.get('id'));
  if (!idResult.success) return null;
  return idResult.data;
}

function normalizeError(error: unknown): string {
  return getErrorMessage(error) ?? 'Internal server error';
}

export async function POST(req: NextRequest) {
  if (!db) {
    return fail('Firebase Admin SDK not initialized.', 500);
  }

  try {
    const body = await parseJsonBody(req, createRecordBodySchema);
    if (!body.success) return body.response;

    const { userId, trackId, totalTime, lapTimes, ...rest } = body.data;
    const newRecordRef = await db.collection('records').add({
      userId,
      trackId,
      totalTime,
      lapTimes,
      createdAt: FieldValue.serverTimestamp(),
      ...rest,
    });

    return ok<RecordMutationResponse>(
      { message: 'Record created successfully', recordId: newRecordRef.id },
      201,
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/records:', error);
    return fail(normalizeError(error), 500);
  }
}

export async function GET(req: NextRequest) {
  if (!db) {
    return fail('Firebase Admin SDK not initialized.', 500);
  }

  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const trackId = req.nextUrl.searchParams.get('trackId');

    let query: FirebaseFirestore.Query = db.collection('records');

    if (userId) query = query.where('userId', '==', userId);
    if (trackId) query = query.where('trackId', '==', trackId);

    const recordsSnapshot = await query.get();
    const records: RecordData[] = recordsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return ok<RecordData[]>(records, 200);
  } catch (error: unknown) {
    console.error('Error in GET /api/records:', error);
    return fail(normalizeError(error), 500);
  }
}

export async function PUT(req: NextRequest) {
  if (!db) {
    return fail('Firebase Admin SDK not initialized.', 500);
  }

  try {
    const recordId = parseRecordId(req);
    if (!recordId) return fail('A record ID is required.', 400);

    const body = await parseJsonBody(req, updateRecordBodySchema);
    if (!body.success) return body.response;

    await db.collection('records').doc(recordId).set(body.data, { merge: true });

    return ok<RecordMutationResponse>({ message: 'Record updated successfully' }, 200);
  } catch (error: unknown) {
    console.error('Error in PUT /api/records:', error);
    return fail(normalizeError(error), 500);
  }
}

export async function DELETE(req: NextRequest) {
  if (!db) {
    return fail('Firebase Admin SDK not initialized.', 500);
  }

  try {
    const recordId = parseRecordId(req);
    if (!recordId) return fail('A record ID is required.', 400);

    await db.collection('records').doc(recordId).delete();

    return ok<RecordMutationResponse>({ message: 'Record deleted successfully' }, 200);
  } catch (error: unknown) {
    console.error('Error in DELETE /api/records:', error);
    return fail(normalizeError(error), 500);
  }
}
