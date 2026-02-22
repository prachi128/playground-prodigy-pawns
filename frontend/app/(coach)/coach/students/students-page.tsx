// app/coach/students/page.tsx - Student Management Page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Users, Search, Award, Eye, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Student {
  id: number;
  username: string;
  email: string;
  xp: number;
  created_at: string;
  last_active: string;
  total_puzzles_attempted: number;
  total_puzzles_solved: number;
  success_rate: number;
}

interface ClassOverview {
  total_students: number;
  average_xp: number;
  most_active: { id: number; username: string; xp: number }[];
  needs_attention: { id: number; username: string; xp: number }[];
}

export default function StudentsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [awardingXP, setAwardingXP] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [isAuthenticated, user, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [studentsData, overviewData] = await Promise.all([
        api.get('/api/coach/students'),
        api.get('/api/coach/students/stats/overview')
      ]);
      
      setStudents(studentsData.data);
      setOverview(overviewData.data);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const awardXP = async (studentId: number, amount: number) => {
    setAwardingXP(studentId);
    try {
      await api.post(`/api/coach/students/${studentId}/award-xp?xp_amount=${amount}`);
      toast.success(`Awarded ${amount} XP!`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to award XP');
    } finally {
      setAwardingXP(null);
    }
  };

  const viewStudent = (studentId: number) => {
    router.push(`/coach/students/${studentId}`);
  };

  const filteredStudents = students.filter(s =>
    s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Users className="w-8 h-8 text-primary-600" />
            Student Management
          </h1>
          <p className="text-gray-600">View and manage your students' progress</p>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-gray-700">Total Students</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600">{overview.total_students}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-green-200">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h3 className="font-bold text-gray-700">Avg XP</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">{overview.average_xp}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-yellow-200">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-6 h-6 text-yellow-600" />
                <h3 className="font-bold text-gray-700">Most Active</h3>
              </div>
              <p className="text-xl font-bold text-yellow-700">
                {overview.most_active[0]?.username || 'None'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-lg border-4 border-red-200">
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="font-bold text-gray-700">Need Attention</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">{overview.needs_attention.length}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-gray-200 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-lg border-4 border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-primary-500 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">XP</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Puzzles</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Success</th>
                  <th className="px-4 py-3 text-left text-sm font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className={`border-t-2 border-gray-100 hover:bg-gray-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-gray-800">{student.username}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-yellow-600">{student.xp}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {student.total_puzzles_solved}/{student.total_puzzles_attempted}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${
                        student.success_rate >= 70 ? 'text-green-600' :
                        student.success_rate >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {student.success_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewStudent(student.id)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => awardXP(student.id, 10)}
                          disabled={awardingXP === student.id}
                          className="p-2 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-all disabled:opacity-50"
                          title="Award 10 XP"
                        >
                          {awardingXP === student.id ? (
                            <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Award className="w-4 h-4 text-yellow-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No students found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
