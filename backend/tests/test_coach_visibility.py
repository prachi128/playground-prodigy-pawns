import unittest
from unittest.mock import MagicMock

from student_management_backend import _coach_can_access_student, _coach_roster_student_ids


def _query_mock_with_rows(rows):
    query = MagicMock()
    query.join.return_value = query
    query.filter.return_value = query
    query.distinct.return_value = query
    query.all.return_value = rows
    query.first.return_value = rows[0] if rows else None
    return query


class CoachVisibilityTests(unittest.TestCase):
    def test_roster_student_ids_includes_primary_and_batch_enrollments(self):
        coach = MagicMock()
        coach.id = 9
        coach.role = "coach"

        assigned_query = _query_mock_with_rows([(1,), (4,)])
        enrolled_query = _query_mock_with_rows([(4,), (7,)])

        db = MagicMock()
        db.query.side_effect = [assigned_query, enrolled_query]

        roster = _coach_roster_student_ids(coach, db)
        self.assertEqual(roster, {1, 4, 7})

    def test_coach_can_access_student_when_directly_assigned(self):
        coach = MagicMock()
        coach.id = 9
        coach.role = "coach"

        assigned_query = _query_mock_with_rows([(3,)])
        enrolled_query = _query_mock_with_rows([])

        db = MagicMock()
        db.query.side_effect = [assigned_query, enrolled_query]

        can_access = _coach_can_access_student(coach, db, student_id=3)
        self.assertTrue(can_access)

    def test_coach_cannot_access_student_when_not_assigned(self):
        coach = MagicMock()
        coach.id = 9
        coach.role = "coach"

        assigned_query = _query_mock_with_rows([])
        enrolled_query = _query_mock_with_rows([])

        db = MagicMock()
        db.query.side_effect = [assigned_query, enrolled_query]

        can_access = _coach_can_access_student(coach, db, student_id=3)
        self.assertFalse(can_access)


if __name__ == "__main__":
    unittest.main()
