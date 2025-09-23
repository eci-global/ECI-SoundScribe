
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface UserToCreate {
  email: string
  password: string
  full_name: string
  email_confirm: boolean
}

const usersToCreate: UserToCreate[] = [
  {
    email: 'bhildebrand@ecisolutions.com',
    password: 'TempPassword123',
    full_name: 'Brian Hildebrand',
    email_confirm: true
  },
  {
    email: 'test@soundscribe.com',
    password: 'TempPassword123',
    full_name: 'Test User',
    email_confirm: true
  },
  {
    email: 'dkoranteng@ecisolutions.com',
    password: 'TempPassword123',
    full_name: 'Daniel Koranteng',
    email_confirm: true
  },
  {
    email: 'normailuser@eci.com',
    password: 'TempPassword123',
    full_name: 'Normal User',
    email_confirm: true
  }
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting user creation process...')
    const results = []

    for (const userData of usersToCreate) {
      console.log(`Creating user: ${userData.email}`)
      
      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(userData.email)
      
      if (existingUser.user) {
        console.log(`User ${userData.email} already exists, skipping...`)
        results.push({
          email: userData.email,
          status: 'exists',
          message: 'User already exists'
        })
        continue
      }

      // Create the user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: userData.email_confirm,
        user_metadata: {
          full_name: userData.full_name
        }
      })

      if (createError) {
        console.error(`Error creating user ${userData.email}:`, createError)
        results.push({
          email: userData.email,
          status: 'error',
          error: createError.message
        })
        continue
      }

      console.log(`User ${userData.email} created successfully`)
      results.push({
        email: userData.email,
        status: 'created',
        user_id: newUser.user?.id
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User creation process completed',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in create-users function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
