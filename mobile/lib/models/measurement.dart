class Measurement {
  final int? id;
  final int babyId;
  final DateTime date;
  final int ageDays;
  final double? weightKg;
  final double? heightCm;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Measurement({
    this.id,
    required this.babyId,
    required this.date,
    required this.ageDays,
    this.weightKg,
    this.heightCm,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toRowMap() {
    return {
      if (id != null) 'id': id,
      'baby_id': babyId,
      'date': date.toUtc().toIso8601String(),
      'age_days': ageDays,
      if (weightKg != null) 'weight_kg': weightKg,
      if (heightCm != null) 'height_cm': heightCm,
      if (notes != null) 'notes': notes,
      'created_at': createdAt.toUtc().toIso8601String(),
      'updated_at': updatedAt.toUtc().toIso8601String(),
    };
  }

  static Measurement fromRowMap(Map<String, dynamic> row) {
    return Measurement(
      id: row['id'] as int?,
      babyId: row['baby_id'] as int? ?? 0,
      date: DateTime.parse(row['date'] as String).toLocal(),
      ageDays: row['age_days'] as int? ?? 0,
      weightKg: row['weight_kg'] != null ? (row['weight_kg'] as num).toDouble() : null,
      heightCm: row['height_cm'] != null ? (row['height_cm'] as num).toDouble() : null,
      notes: row['notes'] as String?,
      createdAt: DateTime.parse(row['created_at'] as String).toLocal(),
      updatedAt: DateTime.parse(row['updated_at'] as String).toLocal(),
    );
  }

  Measurement copyWith({
    int? id,
    int? babyId,
    DateTime? date,
    int? ageDays,
    double? weightKg,
    double? heightCm,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Measurement(
      id: id ?? this.id,
      babyId: babyId ?? this.babyId,
      date: date ?? this.date,
      ageDays: ageDays ?? this.ageDays,
      weightKg: weightKg ?? this.weightKg,
      heightCm: heightCm ?? this.heightCm,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
