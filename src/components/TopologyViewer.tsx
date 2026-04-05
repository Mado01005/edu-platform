'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, BackgroundVariant, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function TopologyViewer() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [loading, setLoading] = useState(true);
  const [heatMapActive, setHeatMapActive] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  
  const isAdmin = (session?.user as any)?.isAdmin === true;

  const fetchTopology = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/topology');
      if (!res.ok) throw new Error('Network response was not ok');
      const json = await res.json();
      
      const enrichedNodes = json.data.nodes.map((n: any) => {
         let bg = '#0A0A0A'; // default dark
         let borderColor = '#333';
         
         if (n.data.type === 'subject') {
           bg = '#4f46e5'; // indigo
           borderColor = '#6366f1';
         } else if (n.data.type === 'folder') {
           bg = '#1f2937'; // gray
           borderColor = '#374151';
         } else if (n.data.type === 'lesson') {
           bg = '#000000';
           borderColor = '#4b5563';
         }

         return {
           ...n,
           style: {
             background: bg,
             color: '#fff',
             border: `2px solid ${borderColor}`,
             borderRadius: '8px',
             padding: '10px 20px',
             fontWeight: 'bold',
             textTransform: 'uppercase',
             fontSize: '10px',
             letterSpacing: '0.1em'
           }
         };
      });

      setNodes(enrichedNodes);
      setEdges(json.data.edges);
    } catch (err) {
      console.error('Topology Load Error:', err);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    fetchTopology();
  }, [fetchTopology]);

  // Apply heatmap dynamically to nodes
  useEffect(() => {
    setNodes((nds) => 
      nds.map((n) => {
        if (n.data.type !== 'lesson') return n;

        // Base styles for lessons
        let updatedStyle = { ...n.style };

        if (heatMapActive && (n.data.frictionScore as number) > 0) {
           const score = n.data.frictionScore as number;
           // If friction > 50%, turn red. If > 20%, turn orange. Else slightly warm.
           let heatColor = '#9a3412'; // orange-800
           if (score > 0.5) heatColor = '#b91c1c'; // red-700
           else if (score > 0.2) heatColor = '#c2410c'; // orange-700

           updatedStyle.background = heatColor;
           updatedStyle.border = `2px solid #ef4444`;
           updatedStyle.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4)';
        } else {
           // Revert back to original lesson style
           updatedStyle.background = '#000000';
           updatedStyle.border = `2px solid #4b5563`;
           updatedStyle.boxShadow = 'none';
        }

        return {
          ...n,
          style: updatedStyle
        };
      })
    );
  }, [heatMapActive, setNodes]);

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    if (node.data.type === 'lesson' && node.data.subjectSlug && node.data.lessonSlug) {
       router.push(`/subjects/${node.data.subjectSlug}/${node.data.lessonSlug}`);
    } else if (node.data.type === 'subject' && node.data.slug) {
       router.push(`/subjects/${node.data.slug}`);
    }
  };

  if (loading) {
     return <div className="h-[400px] w-full flex items-center justify-center border border-white/10 rounded-[2rem] bg-black/50 animate-pulse"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Loading Topology Map...</p></div>;
  }

  return (
    <div className="w-full h-[600px] bg-[#0A0A0F] border border-white/10 rounded-[2rem] overflow-hidden relative shadow-2xl">
       {/* God Mode Controls */}
       {isAdmin && (
         <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button 
              onClick={() => setHeatMapActive(!heatMapActive)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${heatMapActive ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
            >
              God Mode: Heatmap 
              {heatMapActive ? ' (Active)' : ''}
            </button>
         </div>
       )}

       <ReactFlow
         nodes={nodes}
         edges={edges}
         onNodesChange={onNodesChange}
         onEdgesChange={onEdgesChange}
         onNodeClick={onNodeClick}
         fitView
         minZoom={0.1}
         className="dark"
       >
         <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#333" />
         <Controls className="bg-black border border-white/10 fill-white" />
         <MiniMap 
           nodeStrokeColor={(n) => {
             if (n.data.type === 'subject') return '#4f46e5';
             if (n.data.type === 'folder') return '#374151';
             return '#111';
           }}
           nodeColor={(n) => {
             if (heatMapActive && n.data.type === 'lesson' && (n.data.frictionScore as number) > 0.5) return '#b91c1c';
             if (n.data.type === 'subject') return '#indigo';
             return '#000';
           }}
           maskColor="rgba(0,0,0, 0.7)"
           style={{ backgroundColor: '#0A0A0F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
         />
       </ReactFlow>
    </div>
  );
}
