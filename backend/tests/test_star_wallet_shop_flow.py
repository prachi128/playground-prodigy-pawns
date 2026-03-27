import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from main import (
    ConvertXpToStarsRequest,
    ShopPurchaseRequest,
    XP_PER_STAR,
    convert_xp_to_stars,
    get_rewards_wallet,
    purchase_shop_item,
)


class StarWalletShopFlowTests(unittest.TestCase):
    def _db_for_user(self, user_obj):
        q = MagicMock()
        q.filter.return_value = q
        q.first.return_value = user_obj
        db = MagicMock()
        db.query.return_value = q
        return db

    def test_wallet_returns_xp_star_state(self):
        user = SimpleNamespace(id=4, total_xp=450, star_balance=3)
        db = self._db_for_user(user)

        response = get_rewards_wallet(user_id=4, db=db)

        self.assertEqual(response["xp_per_star"], XP_PER_STAR)
        self.assertEqual(response["total_xp"], 450)
        self.assertEqual(response["star_balance"], 3)
        self.assertEqual(response["max_convertible_stars"], 1)

    def test_convert_xp_to_stars_updates_both_balances(self):
        user = SimpleNamespace(id=5, total_xp=900, star_balance=1)
        db = self._db_for_user(user)

        payload = ConvertXpToStarsRequest(stars=3)
        response = convert_xp_to_stars(payload=payload, user_id=5, db=db)

        self.assertEqual(response["xp_spent"], 750)
        self.assertEqual(response["remaining_xp"], 150)
        self.assertEqual(response["star_balance"], 4)
        self.assertEqual(user.total_xp, 150)
        self.assertEqual(user.star_balance, 4)

    def test_convert_xp_to_stars_rejects_insufficient_xp(self):
        user = SimpleNamespace(id=5, total_xp=150, star_balance=1)
        db = self._db_for_user(user)

        with self.assertRaises(HTTPException) as ctx:
            convert_xp_to_stars(payload=ConvertXpToStarsRequest(stars=1), user_id=5, db=db)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Not enough XP", ctx.exception.detail)

    @patch("main.create_notification")
    def test_shop_purchase_deducts_stars(self, _notification_mock):
        user = SimpleNamespace(id=8, star_balance=10)
        db = self._db_for_user(user)
        purchase_record = SimpleNamespace(
            id=99,
            item_key="cool_sunglasses",
            item_name="Cool Sunglasses",
            stars_spent=5,
            delivery_status="pending",
            purchased_at="2026-01-01T00:00:00",
        )
        db.refresh.side_effect = lambda obj: None
        db.add.side_effect = lambda obj: None
        # return purchase object as if db populated it
        with patch("main.ShopPurchase", return_value=purchase_record):
            response = purchase_shop_item(
                payload=ShopPurchaseRequest(item_key="cool_sunglasses"),
                user_id=8,
                db=db,
            )

        self.assertEqual(response["stars_spent"], 5)
        self.assertEqual(response["star_balance"], 5)
        self.assertEqual(user.star_balance, 5)


if __name__ == "__main__":
    unittest.main()
