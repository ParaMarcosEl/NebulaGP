// app/api/records/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/Lib/Firebase/FirebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Handle POST request to create a new record.
 * @route POST /api/records
 * @returns A JSON response with the created record's ID or an error message.
 */
export async function POST(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  try {
    const { userId, trackId, totalTime, lapTimes, ...rest } = await req.json();

    if (!userId || !trackId || totalTime === undefined || !lapTimes) {
      return NextResponse.json(
        { error: 'userId, trackId, totalTime, and lapTimes are required.' },
        { status: 400 },
      );
    }

    // Add the record to the 'records' collection.
    const newRecordRef = await db.collection('records').add({
      userId,
      trackId,
      totalTime,
      lapTimes,
      createdAt: FieldValue.serverTimestamp(),
      ...rest,
    });

    return NextResponse.json(
      {
        message: 'Record created successfully',
        recordId: newRecordRef.id,
      },
      { status: 201 },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in POST /api/records:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle GET request to retrieve records.
 * @route GET /api/records?userId=<userId>&trackId=<trackId>
 * @returns A JSON response with a list of records or an error message.
 */
export async function GET(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const trackId = req.nextUrl.searchParams.get('trackId');

    let query: FirebaseFirestore.Query = db.collection('records');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (trackId) {
      query = query.where('trackId', '==', trackId);
    }

    // You can also add sorting and limits if needed:
    // query = query.orderBy("totalTime", "asc");

    const recordsSnapshot = await query.get();

    const records = recordsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(records, { status: 200 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in GET /api/records:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle PUT request to update an existing record.
 * @route PUT /api/records?id=<recordId>
 * @returns A JSON response confirming the update or an error message.
 */
export async function PUT(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  try {
    const recordId = req.nextUrl.searchParams.get('id');

    if (!recordId) {
      return NextResponse.json({ error: 'A record ID is required.' }, { status: 400 });
    }

    const updates = await req.json();

    await db.collection('records').doc(recordId).set(updates, { merge: true });

    return NextResponse.json({ message: 'Record updated successfully' }, { status: 200 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in PUT /api/records:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle DELETE request to remove a record.
 * @route DELETE /api/records?id=<recordId>
 * @returns A JSON response confirming deletion or an error message.
 */
export async function DELETE(req: NextRequest) {
  if (!db) {
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized.' }, { status: 500 });
  }

  try {
    const recordId = req.nextUrl.searchParams.get('id');

    if (!recordId) {
      return NextResponse.json({ error: 'A record ID is required.' }, { status: 400 });
    }

    await db.collection('records').doc(recordId).delete();

    return NextResponse.json({ message: 'Record deleted successfully' }, { status: 200 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in DELETE /api/records:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
