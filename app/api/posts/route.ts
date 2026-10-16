import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthenticatedUser, ensureUserRecord } from "@/lib/auth";
import {
  mapRowToPost,
  validatePostInput,
  type PostRow,
} from "@/lib/posts";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts
 * Retrieves posts from MySQL ordered by newest first.
 * Supports filters: category, status, search, user_id, limit, page.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || searchParams.get("q");
    const userId = searchParams.get("user_id");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (category && category !== "All" && category.trim()) {
      whereClauses.push("p.category = ?");
      params.push(category.trim());
    }

    if (status && (status === "active" || status === "closed")) {
      whereClauses.push("p.status = ?");
      params.push(status);
    }

    if (userId && userId.trim()) {
      whereClauses.push("p.user_id = ?");
      params.push(userId.trim());
    }

    if (search && search.trim()) {
      whereClauses.push(
        "(p.title LIKE ? OR p.description LIKE ? OR p.event_name LIKE ?)",
      );
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

        const querySql = `
      SELECT 
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.category,
        p.required_skills,
        p.event_name,
        p.deadline,
        p.teammate_count,
        p.faculty_preference,
        p.study_program_preference,
        p.image_url,
        p.status,
        p.created_at,
        p.updated_at,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        pr.faculty AS author_faculty,
        pr.study_program AS author_study_program,
        pr.nim AS author_nim,
        pr.generation AS author_generation,
        pr.bio AS author_bio
      FROM posts p
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [rows] = await db.query<PostRow[]>(querySql, params);
    const posts = rows.map(mapRowToPost);

    return NextResponse.json(
      {
        success: true,
        count: posts.length,
        page,
        limit,
        posts,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[GET /api/posts Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve posts",
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "FETCH_POSTS_FAILED",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/posts
 * Creates a new post in MySQL.
 * Requires user authentication; generates UUID; validates payload.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Please log in to create a post.",
        },
        { status: 401 },
      );
    }

    // 2. Parse request body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request: JSON body is required.",
        },
        { status: 400 },
      );
    }

    // 3. Validate input
    const validation = validatePostInput(body, false);
    if (!validation.valid || !validation.sanitized) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed.",
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    const { sanitized } = validation;

    // 4. Ensure user exists in MySQL users table (foreign key constraint)
    await ensureUserRecord(user);

    // 5. Generate secure UUID
    const id = crypto.randomUUID();

    // 6. Parameterized SQL INSERT
    const insertSql = `
      INSERT INTO posts (
        id,
        user_id,
        title,
        description,
        category,
        required_skills,
        event_name,
        deadline,
        teammate_count,
        faculty_preference,
        study_program_preference,
        image_url,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(insertSql, [
      id,
      user.id,
      sanitized.title,
      sanitized.description,
      sanitized.category,
      JSON.stringify(sanitized.required_skills),
      sanitized.event_name,
      sanitized.deadline,
      sanitized.teammate_count,
      sanitized.faculty_preference,
      sanitized.study_program_preference,
      sanitized.image_url,
      sanitized.status,
    ]);

    // 7. Retrieve the newly created post with author details
    const [rows] = await db.query<PostRow[]>(
      `SELECT 
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.category,
        p.required_skills,
        p.event_name,
        p.deadline,
        p.teammate_count,
        p.faculty_preference,
        p.study_program_preference,
        p.image_url,
        p.status,
        p.created_at,
        p.updated_at,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        pr.faculty AS author_faculty,
        pr.study_program AS author_study_program,
        pr.nim AS author_nim
      FROM posts p
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      WHERE p.id = ?`,
      [id],
    );

    const post = rows.length > 0 ? mapRowToPost(rows[0]) : null;

    return NextResponse.json(
      {
        success: true,
        message: "Post created successfully.",
        post,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[POST /api/posts Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create post.",
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "CREATE_POST_FAILED",
      },
      { status: 500 },
    );
  }
}
