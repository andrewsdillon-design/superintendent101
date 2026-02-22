// API route for mentors
import { NextRequest, NextResponse } from 'next/server'

const mentors = [
  { id: '1', name: 'Mike Smith', username: 'mikesmith', bio: '25 years in commercial construction. OSHA 500 certified.', skills: ['superintendent', 'safety', 'scheduling'], hourlyRate: 75, location: 'Columbus, OH', yearsExperience: 25 },
  { id: '2', name: 'Rachel Johnson', username: 'racheljohnson', bio: 'Former Army Corps. Expert in concrete and steel.', skills: ['concrete', 'steel', 'structural'], hourlyRate: 90, location: 'Austin, TX', yearsExperience: 15 },
  { id: '3', name: 'David Chen', username: 'davidchen', bio: 'Data center specialist. Lean construction advocate.', skills: ['data-centers', 'lean'], hourlyRate: 85, location: 'Phoenix, AZ', yearsExperience: 12 },
  { id: '4', name: 'Sarah Williams', username: 'sarahwilliams', bio: 'Multi-family expert. Passionate about mentoring.', skills: ['multi-family', 'quality-control'], hourlyRate: 80, location: 'Denver, CO', yearsExperience: 18 },
  { id: '5', name: 'Tom Wilson', username: 'tomwilson', bio: 'Healthcare construction expert. JCAHO compliance.', skills: ['healthcare', 'compliance', 'pm'], hourlyRate: 95, location: 'Cleveland, OH', yearsExperience: 22 },
  { id: '6', name: 'Maria Garcia', username: 'mariagarcia', bio: 'Industrial specialist. Steel and welding inspector.', skills: ['steel', 'welding', 'inspection'], hourlyRate: 85, location: 'Houston, TX', yearsExperience: 16 },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const skill = searchParams.get('skill')
  const location = searchParams.get('location')
  const maxRate = searchParams.get('maxRate')
  
  let filtered = [...mentors]
  
  if (skill) {
    filtered = filtered.filter(m => m.skills.includes(skill))
  }
  
  if (location) {
    filtered = filtered.filter(m => m.location.toLowerCase().includes(location.toLowerCase()))
  }
  
  if (maxRate) {
    filtered = filtered.filter(m => m.hourlyRate <= parseInt(maxRate))
  }
  
  return NextResponse.json({ mentors: filtered })
}
