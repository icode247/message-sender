import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
} from "firebase/firestore";
import { NextResponse } from "next/server";
import { withCors } from "@/app/middlewares/handleCores";

export const POST = withCors(async (req) => {
    try {
        const body = await req.json();
        const {
            collection: collectionName,
            filters,
            fields = [],
            limit = 100,
        } = body;

        // Validate required parameters
        if (!collectionName || !filters || !Array.isArray(filters)) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            );
        }

        // Build the query
        let q = query(collection(db, collectionName));

        // Add all filters
        filters.forEach((filter) => {
            q = query(q, where(filter.field, filter.operator, filter.value));
        });

        // Execute query
        const snapshot = await getDocs(q);

        // Process results
        const results = snapshot.docs.slice(0, limit).map((doc) => {
            const data = doc.data();

            // If fields are specified, return only those fields
            if (fields.length > 0) {
                const filteredData = {};

                // Only include id if it's explicitly requested in fields
                if (fields.includes('id')) {
                    filteredData.id = doc.id;
                }

                fields.forEach((field) => {
                    if (field !== 'id' && data[field] !== undefined) {
                        filteredData[field] = data[field];
                    }
                });
                return filteredData;
            }

            return { id: doc.id, ...data };
        });

        return NextResponse.json(
            {
                success: true,
                count: results.length,
                data: results,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Search query failed:", error);
        return NextResponse.json(
            { error: "Search query failed", details: error },
            { status: 500 }
        );
    }
});