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
    def test_roster_student_ids_uses_assigned_coach_only(self):
        coach = MagicMock()
        coach.id = 9
        coach.role = "coach"

        assigned_rows = [(1,), (4,)]

        db = MagicMock()
        db.query.return_value = _query_mock_with_rows(assigned_rows)

        roster = _coach_roster_student_ids(coach, db)
        self.assertEqual(roster, {1, 4})

    def test_coach_can_access_student_when_directly_assigned(self):
        coach = MagicMock()
        coach.id = 9
        coach.role = "coach"

        assigned_query = _query_mock_with_rows([(3,)])
        db = MagicMock()
        db.query.return_value = assigned_query

        can_access = _coach_can_access_student(coach, db, student_id=3)
        self.assertTrue(can_access)

    def test_coach_cannot_access_student_when_not_assigned(self):
        coach = MagicMock()
        coach.id = 9
        coach.role = "coach"

        assigned_query = _query_mock_with_rows([])
        db = MagicMock()
        db.query.return_value = assigned_query

        can_access = _coach_can_access_student(coach, db, student_id=3)
        self.assertFalse(can_access)


if __name__ == "__main__":
    unittest.main()
