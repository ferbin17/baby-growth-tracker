import 'package:intl/intl.dart';

String formatDisplayDate(DateTime date) {
  return DateFormat('MMM d, yyyy').format(date);
}

String formatWeightLabel(double value) {
  return '${value.toStringAsFixed(1)} kg';
}

String formatHeightLabel(double value) {
  return '${value.toStringAsFixed(1)} cm';
}

String getAgeLabel(DateTime birthDate, DateTime now) {
  final diff = now.difference(birthDate);
  final days = diff.inDays;
  if (days < 30) {
    return '$days d';
  }
  final months = (days / 30.4375).floor();
  if (months < 12) {
    return '$months mo';
  }
  final years = (months / 12).floor();
  final remainingMonths = months % 12;
  return remainingMonths > 0 ? '${years}y ${remainingMonths}mo' : '${years}y';
}

String formatMeasurementFrequencyLabel(String value) {
  switch (value) {
    case 'biweekly':
      return 'biweekly';
    case 'monthly':
      return 'monthly';
    default:
      return 'weekly';
  }
}
