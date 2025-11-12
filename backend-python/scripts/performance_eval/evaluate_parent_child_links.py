"""
Parent-Child Link Quality Evaluation - Analyze quality of established ticket relationships.

Evaluates similarity scores, category/priority agreement, and distribution of parent-child links.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

import numpy as np
from app.core.database import get_db_connection
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def evaluate_parent_child_links():
    """
    Evaluate quality of established parent-child relationships.
    """
    logger.info("Starting parent-child link quality evaluation...")
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Get all parent-child pairs with details
            cursor.execute("""
                SELECT 
                    child.incident_number AS child_id,
                    child.category AS child_category,
                    child.priority AS child_priority,
                    parent.incident_number AS parent_id,
                    parent.category AS parent_category,
                    parent.priority AS parent_priority,
                    child.similarity_score
                FROM servicenow_incidents child
                JOIN servicenow_incidents parent ON child.parent_incident = parent.incident_number
                WHERE child.parent_incident IS NOT NULL
            """)
            
            links = cursor.fetchall()
            
            if not links:
                logger.warning("No parent-child links found!")
                print("\n⚠️  No parent-child relationships found in database.")
                print("💡 Run establish_ticket_relationships.py first to create links.")
                return
            
            logger.info(f"Found {len(links)} parent-child links")
            
            print("\n" + "="*60)
            print("PARENT-CHILD LINK QUALITY EVALUATION")
            print("="*60)
            print(f"\n📊 Total Links Analyzed: {len(links)}")
            
            # Similarity score distribution
            similarity_scores = [link[6] for link in links if link[6] is not None]
            
            if similarity_scores:
                print("\n" + "-"*60)
                print("📈 Similarity Score Statistics:")
                print("-"*60)
                print(f"  Mean:   {np.mean(similarity_scores):.4f}")
                print(f"  Median: {np.median(similarity_scores):.4f}")
                print(f"  Std:    {np.std(similarity_scores):.4f}")
                print(f"  Min:    {np.min(similarity_scores):.4f}")
                print(f"  Max:    {np.max(similarity_scores):.4f}")
                print(f"  Count:  {len(similarity_scores)}/{len(links)}")
            else:
                print("\n⚠️  No similarity scores found in links")
            
            # Category agreement
            same_category = sum(1 for link in links if link[1] == link[4])
            category_agreement = same_category / len(links) if links else 0
            
            print("\n" + "-"*60)
            print("📊 Category Agreement:")
            print("-"*60)
            print(f"  Same Category:      {same_category}/{len(links)} ({category_agreement:.1%})")
            print(f"  Different Category: {len(links) - same_category}/{len(links)} ({(1-category_agreement):.1%})")
            
            # Priority agreement
            same_priority = sum(1 for link in links if link[2] == link[5])
            priority_agreement = same_priority / len(links) if links else 0
            
            print("\n" + "-"*60)
            print("📊 Priority Agreement:")
            print("-"*60)
            print(f"  Same Priority:      {same_priority}/{len(links)} ({priority_agreement:.1%})")
            print(f"  Different Priority: {len(links) - same_priority}/{len(links)} ({(1-priority_agreement):.1%})")
            
            # Distribution by similarity buckets
            if similarity_scores:
                print("\n" + "-"*60)
                print("📊 Similarity Distribution:")
                print("-"*60)
                
                buckets = [
                    ('0.95-1.00', 0.95, 1.00),
                    ('0.90-0.95', 0.90, 0.95),
                    ('0.85-0.90', 0.85, 0.90),
                    ('0.80-0.85', 0.80, 0.85),
                    ('0.75-0.80', 0.75, 0.80),
                    ('<0.75', 0.00, 0.75)
                ]
                
                for label, min_score, max_score in buckets:
                    if max_score == 1.00:
                        count = sum(1 for s in similarity_scores if min_score <= s <= max_score)
                    else:
                        count = sum(1 for s in similarity_scores if min_score <= s < max_score)
                    percentage = (count / len(similarity_scores) * 100) if similarity_scores else 0
                    bar = '█' * int(percentage / 2)
                    print(f"  {label}: {count:4d} ({percentage:5.1f}%) {bar}")
            
            # Category breakdown
            print("\n" + "-"*60)
            print("📊 Links by Category:")
            print("-"*60)
            
            category_counts = {}
            for link in links:
                cat = link[1] if link[1] else "Unknown"
                category_counts[cat] = category_counts.get(cat, 0) + 1
            
            sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
            for category, count in sorted_categories[:10]:
                percentage = (count / len(links) * 100) if links else 0
                print(f"  {category[:30]:30s}: {count:4d} ({percentage:5.1f}%)")
            
            if len(sorted_categories) > 10:
                other_count = sum(count for _, count in sorted_categories[10:])
                other_pct = (other_count / len(links) * 100) if links else 0
                print(f"  {'Other':30s}: {other_count:4d} ({other_pct:5.1f}%)")
            
            # Classification Metrics (Precision, Recall, F1)
            # Since we don't have ground truth labels, we use heuristics:
            # - High-quality link: same category AND similarity >= 0.80
            # - All established links are "predicted positives"
            # - We estimate "actual positives" based on category matching potential
            print("\n" + "="*60)
            print("📊 CLASSIFICATION METRICS (Heuristic-Based)")
            print("="*60)
            
            if similarity_scores:
                # True Positives: Same category AND high similarity (>=0.80)
                true_positives = sum(
                    1 for link in links 
                    if link[1] == link[4] and link[6] is not None and link[6] >= 0.80
                )
                
                # False Positives: Different category OR low similarity (<0.80)
                false_positives = sum(
                    1 for link in links
                    if (link[1] != link[4]) or (link[6] is not None and link[6] < 0.80)
                )
                
                # Estimate False Negatives using category distribution
                # Get total tickets per category that could form relationships
                cursor.execute("""
                    SELECT category, COUNT(*) as count
                    FROM servicenow_incidents
                    WHERE category IS NOT NULL
                    GROUP BY category
                    HAVING COUNT(*) > 1
                """)
                category_counts_raw = cursor.fetchall()
                
                # Estimate potential relationships (tickets in same category that could link)
                potential_relationships = sum(
                    count * (count - 1) // 2  # combinations within each category
                    for _, count in category_counts_raw
                    if count > 1
                )
                
                # False Negatives: potential relationships minus those we found
                # This is a rough estimate - actual FN would need ground truth
                estimated_false_negatives = max(0, min(
                    potential_relationships - true_positives,
                    true_positives * 2  # cap at 2x TP to avoid unrealistic estimates
                ))
                
                # Calculate metrics
                precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
                recall = true_positives / (true_positives + estimated_false_negatives) if (true_positives + estimated_false_negatives) > 0 else 0
                f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
                
                print("\n" + "-"*60)
                print("Heuristic Criteria:")
                print("  ✓ True Positive:  Same category AND similarity ≥0.80")
                print("  ✗ False Positive: Different category OR similarity <0.80")
                print("  ? False Negative: Estimated from category distribution")
                print("-"*60)
                
                print(f"\nTrue Positives:  {true_positives:4d} links")
                print(f"False Positives: {false_positives:4d} links")
                print(f"False Negatives: ~{estimated_false_negatives:4d} links (estimated)")
                
                print(f"\n📈 Precision: {precision:.4f} ({precision*100:.2f}%)")
                print(f"   → Of all predicted links, {precision*100:.1f}% are high-quality")
                
                print(f"\n📈 Recall:    {recall:.4f} ({recall*100:.2f}%)")
                print(f"   → Of all potential links, {recall*100:.1f}% were identified")
                
                print(f"\n📈 F1 Score:  {f1_score:.4f} ({f1_score*100:.2f}%)")
                print(f"   → Harmonic mean of precision and recall")
                
                # Interpretation
                print("\n" + "-"*60)
                print("Interpretation:")
                if precision >= 0.80 and recall >= 0.50:
                    print("  ✅ EXCELLENT - High precision and good recall")
                elif precision >= 0.70 and recall >= 0.40:
                    print("  ✓ GOOD - Solid precision, acceptable recall")
                elif precision >= 0.60 and recall >= 0.30:
                    print("  ⚠️  FAIR - Moderate quality, room for improvement")
                else:
                    print("  ❌ POOR - Low precision or recall, needs improvement")
                
                print("\nNote: Metrics are heuristic-based estimates.")
                print("For accurate evaluation, labeled ground truth data is needed.")
            else:
                print("\n⚠️  Cannot calculate classification metrics without similarity scores")
            
            # Success criteria
            print("\n" + "="*60)
            print("SUCCESS CRITERIA EVALUATION")
            print("="*60)
            
            if similarity_scores:
                mean_sim = np.mean(similarity_scores)
                print(f"\n✓ Mean similarity >0.80 for linked tickets: ", end="")
                if mean_sim > 0.80:
                    print(f"✅ PASS ({mean_sim:.4f})")
                elif mean_sim > 0.75:
                    print(f"⚠️  MARGINAL ({mean_sim:.4f})")
                else:
                    print(f"❌ FAIL ({mean_sim:.4f})")
            
            print(f"✓ Category agreement >70%: ", end="")
            if category_agreement > 0.70:
                print(f"✅ PASS ({category_agreement:.1%})")
            elif category_agreement > 0.60:
                print(f"⚠️  MARGINAL ({category_agreement:.1%})")
            else:
                print(f"❌ FAIL ({category_agreement:.1%})")
            
            if similarity_scores:
                optimal_range = sum(1 for s in similarity_scores if 0.80 <= s <= 0.95)
                optimal_pct = (optimal_range / len(similarity_scores)) if similarity_scores else 0
                
                print(f"✓ Most links in 0.80-0.95 range: ", end="")
                if optimal_pct > 0.50:
                    print(f"✅ PASS ({optimal_pct:.1%} in range)")
                elif optimal_pct > 0.30:
                    print(f"⚠️  MARGINAL ({optimal_pct:.1%} in range)")
                else:
                    print(f"❌ FAIL ({optimal_pct:.1%} in range)")
            
            # Quality assessment
            print("\n" + "-"*60)
            print("📊 Overall Link Quality: ", end="")
            
            quality_score = 0
            if similarity_scores and np.mean(similarity_scores) > 0.80:
                quality_score += 1
            if category_agreement > 0.70:
                quality_score += 1
            if similarity_scores and sum(1 for s in similarity_scores if 0.80 <= s <= 0.95) / len(similarity_scores) > 0.50:
                quality_score += 1
            
            if quality_score == 3:
                print("⭐⭐⭐ EXCELLENT")
            elif quality_score == 2:
                print("⭐⭐ GOOD")
            elif quality_score == 1:
                print("⭐ FAIR")
            else:
                print("⚠️  NEEDS IMPROVEMENT")
            
            print("\n" + "="*60)
            print("EVALUATION COMPLETE")
            print("="*60)
            
    except Exception as e:
        logger.error(f"Error during evaluation: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    evaluate_parent_child_links()
