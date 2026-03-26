import unittest
from unittest.mock import MagicMock, patch

from database import validate_required_schema


class SchemaSanityTests(unittest.TestCase):
    def test_schema_validation_raises_for_missing_column(self):
        inspector = MagicMock()
        inspector.has_table.return_value = True
        inspector.get_columns.return_value = [{"name": "id"}, {"name": "email"}]

        with patch("database.inspect", return_value=inspector):
            with self.assertRaises(RuntimeError) as ctx:
                validate_required_schema()
        self.assertIn("users.primary_coach_id", str(ctx.exception))
        self.assertIn("users.star_balance", str(ctx.exception))

    def test_schema_validation_passes_when_required_columns_exist(self):
        inspector = MagicMock()
        inspector.has_table.return_value = True
        inspector.get_columns.return_value = [
            {"name": "id"},
            {"name": "email"},
            {"name": "primary_coach_id"},
            {"name": "star_balance"},
        ]

        with patch("database.inspect", return_value=inspector):
            validate_required_schema()


if __name__ == "__main__":
    unittest.main()
