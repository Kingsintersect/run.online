import { NextRequest, NextResponse } from 'next/server'

type Department = {
    slug: string
    name: string
    desc: string
    programs: string[]
}

const departments: Record<string, Department> = {
    engineering: {
        slug: 'engineering',
        name: 'Engineering',
        desc: 'Engineering faculty',
        programs: ['Civil', 'Mechanical', 'Electrical', 'Computer'],
    },
    sciences: {
        slug: 'sciences',
        name: 'Sciences',
        desc: 'Sciences faculty',
        programs: ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
    },
    // add other departments here...
}

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
    const { slug } = await context.params
    const dept: Department | undefined = departments[slug]
    if (!dept) {
        return NextResponse.json({ message: 'Department not found' }, { status: 404 })
    }
    return NextResponse.json(dept)
}