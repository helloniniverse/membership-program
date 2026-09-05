HARRISON VIP PROGRAM SIMULATOR — COMPLETE SYSTEM

CONNECTED MODEL
1) First year is the financial base.
   Membership Fee − Base Privilege Cost = Membership Contribution.
   If Base Privilege Cost exceeds the membership fee, the difference is the first-year Gap.

2) Required paid sales recover the first-year Gap using the conservative GP rate.
   Conservative Maximum Planning Cost = Paid Sales × 87.04%
   Conservative GP = Paid Sales × 12.96%
   Required Sales = Gap ÷ 12.96%

3) Loyalty is driven by the same paid sales.
   House Points = FLOOR(Paid Sales ÷ HP Spend Threshold) × HP per Block
   PCQP = FLOOR(Conservative GP × 10%)

4) Target Sales is a single driver for Target GP + Target HP + Target PCQP.
   Boss/Marketing targets can be synced automatically; Custom target is editable.

5) Renewal is always paid and always available.
   Minimum Annual Paid Sales is the discount gateway.
   Minimum HP and Minimum PCQP are automatically derived from that sales threshold.
   PCQP selects the renewal discount tier.
   Final Renewal Fee = Base Renewal Fee × (1 − Applied Discount)

6) Renewal economics use the same first-year Base Privilege Cost selected under
   "Base Privilege Package Used for Renewal".
   A safety floor prevents the discounted renewal fee from dropping below that cost.
   Any remaining renewal Gap is converted to required paid sales using 12.96% GP.

DEFAULT EXAMPLE CHECK
Boss: 104 max meals; ₱14,870.40 max privilege cost; ₱8,871.40 gap; ₱68,452.16 required sales.
Marketing: 52 max meals + two enabled ₱229 rewards; ₱7,958.24 max privilege cost; ₱1,959.24 gap; ₱15,117.59 required sales.
At ₱15,000 annual paid sales: 150 HP and 194 PCQP.

FILES
index.html — interface
styles.css — styling
app.js — all calculations and interactions
