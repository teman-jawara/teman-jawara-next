import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  mapRowToPost,
  validatePostInput,
  type PostRow,
} from "@/lib/posts";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/posts/[id]
 * Retrieves a single post by ID along with its author details.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;

    if (!id || id.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Post ID is required." },
        { status: 400 },
      );
    }

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
        pr.nim AS author_nim,
        pr.generation AS author_generation,
        pr.bio AS author_bio
      FROM posts p
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      WHERE p.id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Post not found." },
        { status: 404 },
      );
    }

    const post = mapRowToPost(rows[0]);

    return NextResponse.json(
      {
        success: true,
        post,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[GET /api/posts/[id] Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve post.",
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "FETCH_POST_FAILED",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/posts/[id]
 * Updates an existing post.
 * Requires authentication and verifies post ownership.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;

    if (!id || id.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Post ID is required." },
        { status: 400 },
      );
    }

    // 1. Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Please log in to edit this post.",
        },
        { status: 401 },
      );
    }

    // 2. Fetch existing post to check existence and ownership
    const [existingRows] = await db.query<PostRow[]>(
      `SELECT * FROM posts WHERE id = ?`,
      [id],
    );

    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Post not found." },
        { status: 404 },
      );
    }

    const existingPost = existingRows[0];

    // 3. Verify authorization (only author can update)
    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: You are not authorized to update this post.",
        },
        { status: 403 },
      );
    }

    // 4. Parse request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request: JSON body is required." },
        { status: 400 },
      );
    }

    // Merge incoming changes with existing post values
    const mergedData = {
      title: body.title !== undefined ? body.title : existingPost.title,
      description:
        body.description !== undefined
          ? body.description
          : existingPost.description,
      category:
        body.category !== undefined ? body.category : existingPost.category,
      required_skills:
        body.required_skills !== undefined
          ? body.required_skills
          : existingPost.required_skills,
      event_name:
        body.event_name !== undefined
          ? body.event_name
          : existingPost.event_name,
      deadline:
        body.deadline !== undefined ? body.deadline : existingPost.deadline,
      teammate_count:
        body.teammate_count !== undefined
          ? body.teammate_count
          : existingPost.teammate_count,
      faculty_preference:
        body.faculty_preference !== undefined
          ? body.faculty_preference
          : existingPost.faculty_preference,
      study_program_preference:
        body.study_program_preference !== undefined
          ? body.study_program_preference
          : existingPost.study_program_preference,
      image_url:
        body.image_url !== undefined ? body.image_url : existingPost.image_url,
      status: body.status !== undefined ? body.status : existingPost.status,
    };

    // 5. Validate merged data
    const validation = validatePostInput(mergedData, false);
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

    // 6. Execute parameterized UPDATE
    const updateSql = `
      UPDATE posts SET
        title = ?,
        description = ?,
        category = ?,
        required_skills = ?,
        event_name = ?,
        deadline = ?,
        teammate_count = ?,
        faculty_preference = ?,
        study_program_preference = ?,
        image_url = ?,
        status = ?
      WHERE id = ?
    `;

    await db.query(updateSql, [
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
      id,
    ]);

    // 7. Return updated post with author details
    const [updatedRows] = await db.query<PostRow[]>(
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
        pr.nim AS author_nim,
        pr.generation AS author_generation,
        pr.bio AS author_bio
      FROM posts p
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      WHERE p.id = ?`,
      [id],
    );

    const post = updatedRows.length > 0 ? mapRowToPost(updatedRows[0]) : null;

    return NextResponse.json(
      {
        success: true,
        message: "Post updated successfully.",
        post,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[PUT /api/posts/[id] Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update post.",
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "UPDATE_POST_FAILED",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/posts/[id]
 * Deletes an existing post.
 * Requires authentication and verifies post ownership.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;

    if (!id || id.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Post ID is required." },
        { status: 400 },
      );
    }

    // 1. Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Please log in to delete this post.",
        },
        { status: 401 },
      );
    }

    // 2. Fetch existing post
    const [existingRows] = await db.query<PostRow[]>(
      `SELECT id, user_id FROM posts WHERE id = ?`,
      [id],
    );

    if (existingRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Post not found." },
        { status: 404 },
      );
    }

    // 3. Verify authorization
    if (existingRows[0].user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: You are not authorized to delete this post.",
        },
        { status: 403 },
      );
    }

    // 4. Parameterized DELETE query
    await db.query(`DELETE FROM posts WHERE id = ?`, [id]);

    return NextResponse.json(
      {
        success: true,
        message: "Post deleted successfully.",
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[DELETE /api/posts/[id] Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete post.",
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "DELETE_POST_FAILED",
      },
      { status: 500 },
    );
  }
}
