import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();

    const { data: subjects, error: subjErr } = await supabaseAdmin.from('subjects').select('*');
    const { data: content, error: contErr } = await supabaseAdmin.from('content_items').select('*');
    
    // Admins need focus data for heatmap
    let frictionData: Record<string, { completed: number; interrupted: number }> = {};
    if (session?.user?.isAdmin) {
       const { data: sessions } = await supabaseAdmin.from('focus_sessions').select('lesson_id, status');
       sessions?.forEach(s => {
         if (!frictionData[s.lesson_id]) frictionData[s.lesson_id] = { completed: 0, interrupted: 0 };
         if (s.status === 'completed') frictionData[s.lesson_id].completed++;
         else frictionData[s.lesson_id].interrupted++;
       });
    }

    if (subjErr || contErr) throw new Error('Failed to fetch topology data');

    const nodes: any[] = [];
    const edges: any[] = [];
    
    let currentX = 0;
    
    subjects?.forEach((subj: any) => {
      nodes.push({
        id: `subject-${subj.id}`,
        type: 'default',
        position: { x: currentX, y: 0 },
        data: { label: subj.title, type: 'subject', slug: subj.slug }
      });
      
      const modules = content?.filter((c: any) => c.subject_id === subj.id && (!c.parent_id));
      
      let moduleXOffset = currentX - (modules.length * 150) / 2;

      modules?.forEach((mod: any) => {
        const modId = `module-${mod.id}`;
        
        nodes.push({
          id: modId,
          type: 'default',
          position: { x: moduleXOffset, y: 150 },
          data: { label: mod.name, type: 'folder' }
        });
        
        edges.push({
          id: `e-subj-${subj.id}-mod-${mod.id}`,
          source: `subject-${subj.id}`,
          target: modId,
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 }
        });

        const lessons = content?.filter((c: any) => c.parent_id === mod.id);
        
        lessons?.forEach((les: any, k: number) => {
           const lesId = `lesson-${les.id}`;
           const friction = frictionData[les.id] || { completed: 0, interrupted: 0 };
           const total = friction.completed + friction.interrupted;
           const frictionScore = total > 0 ? friction.interrupted / total : 0;
           
           nodes.push({
             id: lesId,
             type: 'default', // standard node
             position: { x: moduleXOffset + (k * 150) - (lessons.length * 75), y: 300 + (k % 2 === 0 ? 0 : 50) },
             data: { 
               label: les.name, 
               type: 'lesson', 
               subjectSlug: subj.slug, 
               lessonSlug: les.slug || les.id,
               frictionScore 
             }
           });
           
           edges.push({
             id: `e-mod-${mod.id}-les-${les.id}`,
             source: modId,
             target: lesId,
             style: { stroke: '#4b5563' }
           });
        });
        
        moduleXOffset += 300; // Space out modules
      });
      
      currentX += Math.max(modules.length * 300, 400); // Space out subjects based on their modules payload
    });

    return NextResponse.json({
      success: true,
      data: { nodes, edges }
    });
  } catch (error: any) {
    console.error('[TOPOLOGY_API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
