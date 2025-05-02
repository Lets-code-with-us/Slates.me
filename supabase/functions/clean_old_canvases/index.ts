
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    console.log('Starting cleanup of old canvases...')
    
    // Get canvases older than 3 days
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    const { data: oldCanvases, error: fetchError } = await supabase
      .from('canvases')
      .select('id, code')
      .lt('created_at', threeDaysAgo.toISOString())
    
    if (fetchError) {
      throw fetchError
    }
    
    console.log(`Found ${oldCanvases?.length || 0} canvases to delete`)
    
    // Delete each canvas and its associated nodes and files
    for (const canvas of oldCanvases || []) {
      console.log(`Processing canvas ${canvas.id} (${canvas.code})`)
      
      // 1. Get all nodes with file paths
      const { data: nodes, error: nodesError } = await supabase
        .from('nodes')
        .select('file_path')
        .eq('canvas_id', canvas.id)
        .not('file_path', 'is', null)
      
      if (nodesError) {
        console.error(`Error fetching nodes for canvas ${canvas.id}:`, nodesError)
        continue
      }
      
      // 2. Delete files from storage
      const filePaths = nodes?.map(node => node.file_path).filter(Boolean) || []
      
      if (filePaths.length > 0) {
        console.log(`Deleting ${filePaths.length} files for canvas ${canvas.id}`)
        const { error: filesError } = await supabase
          .storage
          .from('slate_files')
          .remove(filePaths)
        
        if (filesError) {
          console.error(`Error deleting files for canvas ${canvas.id}:`, filesError)
        }
      }
      
      // 3. Delete nodes
      console.log(`Deleting nodes for canvas ${canvas.id}`)
      const { error: deleteNodesError } = await supabase
        .from('nodes')
        .delete()
        .eq('canvas_id', canvas.id)
      
      if (deleteNodesError) {
        console.error(`Error deleting nodes for canvas ${canvas.id}:`, deleteNodesError)
      }
      
      // 4. Delete canvas
      console.log(`Deleting canvas ${canvas.id}`)
      const { error: deleteCanvasError } = await supabase
        .from('canvases')
        .delete()
        .eq('id', canvas.id)
      
      if (deleteCanvasError) {
        console.error(`Error deleting canvas ${canvas.id}:`, deleteCanvasError)
      }
    }
    
    console.log('Cleanup completed successfully')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${oldCanvases?.length || 0} old canvases` 
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in cleanup process:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})
