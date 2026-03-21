import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/abdallahsaad/Downloads/edu-platform/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase keys in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const METADATA_PATH = path.join('/Users/abdallahsaad/Downloads/edu-platform', 'src', 'data', 'content-metadata.json');

async function uploadContentNodes(nodes, lessonId, parentId = null) {
  for (const node of nodes) {
    const { data, error } = await supabase.from('content_items').insert({
      lesson_id: lessonId,
      parent_id: parentId,
      item_type: node.type,
      file_type: node.fileType || null,
      name: node.name,
      url: node.url || null,
      vimeo_id: node.vimeoId || null,
    }).select().single();

    if (error) {
      console.error('Error inserting content node:', node.name, error);
      continue;
    }

    if (node.type === 'folder' && node.children) {
      // Recursively upload children
      await uploadContentNodes(node.children, lessonId, data.id);
    }
  }
}

async function migrate() {
  console.log('Starting migration to Supabase...');
  const rawData = fs.readFileSync(METADATA_PATH, 'utf-8');
  const subjects = JSON.parse(rawData);

  // Clear existing items just in case (optional, assumes empty DB)
  await supabase.from('subjects').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 

  for (const subject of subjects) {
    console.log(`Migrating Subject: ${subject.title}...`);
    const { data: subjectData, error: subjectError } = await supabase.from('subjects').insert({
      slug: subject.slug,
      title: subject.title,
      icon: subject.icon,
      color: subject.color
    }).select().single();

    if (subjectError) {
      console.error('Error inserting subject:', subject.title, subjectError);
      continue;
    }

    for (const lesson of subject.lessons) {
      console.log(`  -> Migrating Lesson: ${lesson.title}...`);
      const { data: lessonData, error: lessonError } = await supabase.from('lessons').insert({
        subject_id: subjectData.id,
        slug: lesson.slug,
        title: lesson.title
      }).select().single();

      if (lessonError) {
        console.error('  Error inserting lesson:', lesson.title, lessonError);
        continue;
      }

      // Upload the nested content tree
      await uploadContentNodes(lesson.content, lessonData.id);
    }
  }

  console.log('Migration Complete!');
}

migrate();
