from django.utils import timezone
from apps.core.permissions import notify_user


def ensure_deal_for_nda(nda):
    """
    Safely creates or fetches the Deal record for a completed NDA.
    Ensures idempotency (no duplicates), correct relations, and records status history.
    """
    from apps.deals.models import Deal, DealStatusHistory

    # Both parties must have accepted or NDA status is completed
    if not (nda.status == 'completed' or (nda.buyer_accepted and nda.seller_accepted)):
        return None

    deal, created = Deal.objects.get_or_create(
        nda=nda,
        defaults={
            'business': nda.business,
            'request': nda.request,
            'buyer': nda.buyer,
            'seller': nda.seller,
            'buyer_name': nda.buyer_name or nda.buyer.get_full_name() or nda.buyer.username,
            'seller_name': nda.seller_name or nda.seller.get_full_name() or nda.seller.username,
            'status': Deal.DealStatus.NDA_COMPLETED,
        }
    )

    # Ensure relations and names are properly synced
    changed = False
    if not deal.request and nda.request:
        deal.request = nda.request
        changed = True
    if not deal.business and nda.business:
        deal.business = nda.business
        changed = True
    if not deal.buyer_name:
        deal.buyer_name = nda.buyer_name or nda.buyer.get_full_name() or nda.buyer.username
        changed = True
    if not deal.seller_name:
        deal.seller_name = nda.seller_name or nda.seller.get_full_name() or nda.seller.username
        changed = True
    if changed:
        deal.save()

    if created:
        DealStatusHistory.objects.create(
            deal=deal,
            from_status='',
            to_status=deal.status,
            changed_by=nda.seller if nda.seller_accepted else nda.buyer,
            note='Deal opened automatically upon mutual NDA completion.'
        )
        business_title = nda.business.title if nda.business else 'Business'
        notify_user(
            nda.buyer,
            'Deal Started!',
            f'NDA complete for "{business_title}". Your active deal has begun.',
            '/deals',
            'success'
        )
        notify_user(
            nda.seller,
            'Deal Started!',
            f'NDA complete for "{business_title}". Your active deal has begun.',
            '/deals',
            'success'
        )

    return deal
