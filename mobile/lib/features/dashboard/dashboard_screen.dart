import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';

import '../../core/formatters.dart';
import '../../models/baby_profile.dart';
import '../../models/measurement.dart';
import '../../services/supabase_service.dart';
import '../auth/login_screen.dart';
import '../setup/setup_profile_screen.dart';

bool hasPendingMeasurements(List<Measurement> measurements) {
  final now = DateTime.now();
  return measurements.any((measurement) {
    final measurementDate = measurement.date.toLocal();
    return !measurementDate.isAfter(now) && (measurement.weightKg == null || measurement.heightCm == null);
  });
}

class DashboardScreen extends StatefulWidget {
  final BabyProfile? babyProfile;

  const DashboardScreen({super.key, this.babyProfile});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final SupabaseService _service = SupabaseService();
  BabyProfile? _baby;
  List<Measurement> _measurements = [];
  Measurement? _latest;
  Measurement? _next;
  bool _loading = true;
  bool _canRecord = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);

    final baby = widget.babyProfile;
    if (baby == null || baby.id == null) {
      if (!mounted) return;
      setState(() => _loading = false);
      return;
    }

    try {
      await _service.ensureMeasurementsForBaby(baby.id!, baby);
      final measurements = await _service.getMeasurements(baby.id!);
      final latest = await _service.getLatestCompletedMeasurement(baby.id!);

      final next = measurements
          .where((item) => item.date.isAfter(DateTime.now()))
          .fold<Measurement?>(null, (current, item) {
            if (current == null || item.date.isBefore(current.date)) return item;
            return current;
          });

      if (!mounted) return;
      setState(() {
        _baby = baby;
        _measurements = measurements;
        _latest = latest;
        _next = next;
        _canRecord = hasPendingMeasurements(measurements);
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to load dashboard: $error')),
      );
    }
  }

  void _logout() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final baby = _baby;
    if (baby == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('No baby profile found'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const DashboardScreen()),
                ),
                child: const Text('Go back'),
              ),
            ],
          ),
        ),
      );
    }

    final visibleMeasurements = _measurements
        .where((measurement) => measurement.weightKg != null || measurement.heightCm != null)
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            tooltip: 'Profile',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => ProfileScreen(baby: baby, measurements: visibleMeasurements)),
            ),
            icon: const Icon(Icons.person_outline),
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: _logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _canRecord
            ? () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => MeasurementEntryScreen(baby: baby)),
              )
            : null,
        label: const Text('Add measurement'),
        icon: const Icon(Icons.add),
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFF8FAFC),
              Color(0xFFF5F7FB),
            ],
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(26),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                gradient: const LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [Color(0xFF0F766E), Color(0xFF10B981)],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    baby.name,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Age: ${getAgeLabel(baby.birthDate, DateTime.now())}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'Birth date: ${DateFormat('MMM d, yyyy').format(baby.birthDate)}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    'Next measurement: ${_next == null ? 'Completed' : DateFormat('MMM d, yyyy').format(_next!.date)}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _MetricCard(
                    title: 'Weight',
                    value: formatWeightLabel(_latest?.weightKg ?? baby.birthWeightKg),
                  ),
                ),
                Expanded(
                  child: _MetricCard(
                    title: 'Height',
                    value: formatHeightLabel(_latest?.heightCm ?? baby.birthHeightCm),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _GrowthSummaryCard(baby: baby, measurements: _measurements),
            const SizedBox(height: 16),
            GrowthChartCard(measurements: visibleMeasurements),
            const SizedBox(height: 16),
            _MeasurementListCard(measurements: visibleMeasurements),
          ],
        ),
      ),
    );
  }
}

class ProfileScreen extends StatelessWidget {
  final BabyProfile baby;
  final List<Measurement> measurements;

  const ProfileScreen({super.key, required this.baby, required this.measurements});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              baby.name,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 20),
            _InfoRow(label: 'Gender', value: baby.gender.displayName),
            _InfoRow(label: 'Birth date', value: DateFormat('MMM d, yyyy').format(baby.birthDate)),
            _InfoRow(label: 'Birth weight', value: formatWeightLabel(baby.birthWeightKg)),
            _InfoRow(label: 'Birth height', value: formatHeightLabel(baby.birthHeightCm)),
            _InfoRow(label: 'Frequency', value: baby.measurementFrequency.displayName),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => AllMeasurementsScreen(measurements: measurements)),
                    ),
                    icon: const Icon(Icons.list_alt_outlined),
                    label: const Text('Measurements'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => SetupProfileScreen(existingProfile: baby)),
                    ),
                    icon: const Icon(Icons.edit_outlined),
                    label: const Text('Edit profile'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Back to dashboard'),
            ),
          ],
        ),
      ),
    );
  }
}

class AllMeasurementsScreen extends StatelessWidget {
  final List<Measurement> measurements;

  const AllMeasurementsScreen({super.key, required this.measurements});

  @override
  Widget build(BuildContext context) {
    final sorted = [...measurements]
      ..sort((a, b) => b.date.compareTo(a.date));

    return Scaffold(
      appBar: AppBar(title: const Text('All measurements')),
      body: sorted.isEmpty
          ? const Center(child: Text('No measurements yet.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: sorted.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final measurement = sorted[index];
                final subtitle = [
                  if (measurement.weightKg != null) formatWeightLabel(measurement.weightKg!),
                  if (measurement.heightCm != null) formatHeightLabel(measurement.heightCm!),
                ].join(' • ');

                return ListTile(
                  title: Text(DateFormat('MMM d, yyyy').format(measurement.date)),
                  subtitle: Text(subtitle.isEmpty ? 'No recorded values' : subtitle),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => MeasurementDetailScreen(measurement: measurement),
                    ),
                  ),
                );
              },
            ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;

  const _MetricCard({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 8),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GrowthSummaryCard extends StatelessWidget {
  final BabyProfile baby;
  final List<Measurement> measurements;

  const _GrowthSummaryCard({required this.baby, required this.measurements});

  @override
  Widget build(BuildContext context) {
    final latest = measurements
        .where((measurement) => measurement.date.isBefore(DateTime.now()) || measurement.date.isAtSameMomentAs(DateTime.now()))
        .where((measurement) => measurement.weightKg != null || measurement.heightCm != null)
        .fold<Measurement?>(null, (current, next) {
          if (current == null || next.date.isAfter(current.date)) return next;
          return current;
        });
    final weight = latest?.weightKg ?? baby.birthWeightKg;
    final height = latest?.heightCm ?? baby.birthHeightCm;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Growth status', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            _StatusRow(label: 'Weight-for-age', value: formatWeightLabel(weight)),
            _StatusRow(label: 'Height-for-age', value: formatHeightLabel(height)),
            _StatusRow(label: 'Check-ins', value: '${measurements.length}'),
          ],
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final String value;

  const _StatusRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class GrowthChartCard extends StatefulWidget {
  final List<Measurement> measurements;
  final bool canRecord;
  final VoidCallback? onAddMeasurement;

  const GrowthChartCard({
    super.key,
    required this.measurements,
    this.canRecord = false,
    this.onAddMeasurement,
  });

  @override
  State<GrowthChartCard> createState() => _GrowthChartCardState();
}

class _GrowthChartCardState extends State<GrowthChartCard> {
  bool _showWeight = true;
  int? _selectedIndex;

  @override
  Widget build(BuildContext context) {
    final sortedMeasurements = [...widget.measurements]
      ..sort((a, b) => a.date.compareTo(b.date));

    final values = <double>[];
    final labels = <String>[];

    for (final measurement in sortedMeasurements) {
      final value = _showWeight ? measurement.weightKg : measurement.heightCm;
      if (value != null) {
        values.add(value);
        labels.add(DateFormat('MMM d').format(measurement.date));
      }
    }

    if (values.length < 2) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Text('Add more measurements to view the growth chart.'),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 12,
              runSpacing: 8,
              children: [
                const Text('Growth chart', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SegmentedButton<bool>(
                      segments: const [
                        ButtonSegment(value: true, label: Text('Weight')),
                        ButtonSegment(value: false, label: Text('Height')),
                      ],
                      selected: {_showWeight},
                      onSelectionChanged: (selection) => setState(() {
                        _showWeight = selection.first;
                        _selectedIndex = null;
                      }),
                    ),
                    const SizedBox(width: 8),
                    PopupMenuButton<String>(
                      tooltip: 'Export chart data',
                      onSelected: (value) => _downloadExport(value),
                      itemBuilder: (context) => const [
                        PopupMenuItem(value: 'csv', child: Text('Download CSV')),
                        PopupMenuItem(value: 'excel', child: Text('Download Excel')),
                      ],
                      child: const Icon(Icons.download_outlined),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                final color = _showWeight ? const Color(0xFF3B82F6) : const Color(0xFF14B8A6);
                final leftPadding = 28.0;
                final rightPadding = 18.0;
                final topPadding = 22.0;
                final bottomPadding = 32.0;
                final chartHeight = 220 - topPadding - bottomPadding;
                final chartWidth = constraints.maxWidth - leftPadding - rightPadding;
                final minValue = values.reduce((a, b) => a < b ? a : b) * 0.95;
                final maxValue = values.reduce((a, b) => a > b ? a : b) * 1.05;
                final range = maxValue - minValue == 0 ? 1.0 : maxValue - minValue;

                final points = <Offset>[];
                for (int i = 0; i < values.length; i++) {
                  final x = leftPadding + (chartWidth / math.max(1, values.length - 1)) * i;
                  final ratio = (values[i] - minValue) / range;
                  final y = 220 - bottomPadding - ratio * chartHeight;
                  points.add(Offset(x, y));
                }

                final selectedPoint = _selectedIndex == null ? null : points[_selectedIndex!];
                final selectedValue = _selectedIndex == null ? null : values[_selectedIndex!];
                final selectedLabel = _selectedIndex == null ? null : labels[_selectedIndex!];

                return SizedBox(
                  width: constraints.maxWidth,
                  height: 220,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      GestureDetector(
                        onTapDown: (details) {
                          final tapPoint = details.localPosition;
                          if (points.isEmpty) return;

                          var closest = 0;
                          var smallestDistance = double.infinity;

                          for (int i = 0; i < points.length; i++) {
                            final distance = (points[i] - tapPoint).distance;
                            if (distance < smallestDistance) {
                              smallestDistance = distance;
                              closest = i;
                            }
                          }

                          if (smallestDistance <= 24) {
                            setState(() => _selectedIndex = closest);
                          } else {
                            setState(() => _selectedIndex = null);
                          }
                        },
                        child: SizedBox(
                          width: constraints.maxWidth,
                          height: 220,
                          child: CustomPaint(
                            painter: GrowthChartPainter(
                              values: values,
                              labels: labels,
                              color: color,
                              selectedIndex: _selectedIndex,
                            ),
                          ),
                        ),
                      ),
                      if (selectedPoint != null && selectedValue != null && selectedLabel != null)
                        Positioned(
                          left: math.max(8, math.min(constraints.maxWidth - 104, selectedPoint.dx - 42)),
                          top: math.max(8, selectedPoint.dy - 46),
                          child: Stack(
                            children: [
                              Positioned(
                                left: 30,
                                top: 28,
                                child: Transform.rotate(
                                  angle: math.pi,
                                  child: CustomPaint(
                                    size: const Size(12, 8),
                                    painter: _TooltipPointerPainter(),
                                  ),
                                ),
                              ),
                              DecoratedBox(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x1A0F172A),
                                      blurRadius: 8,
                                      offset: Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        selectedLabel,
                                        style: const TextStyle(
                                          color: Color(0xFF475569),
                                          fontSize: 9,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(height: 1),
                                      Text(
                                        '${selectedValue.toStringAsFixed(_showWeight ? 3 : 1)} ${_showWeight ? 'kg' : 'cm'}',
                                        style: const TextStyle(
                                          color: Color(0xFF0F172A),
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (widget.canRecord)
                        Positioned(
                          right: 16,
                          bottom: -18,
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: widget.onAddMeasurement,
                              borderRadius: BorderRadius.circular(18),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2CC7A4),
                                  borderRadius: BorderRadius.circular(18),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x400F172A),
                                      blurRadius: 10,
                                      offset: Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Icon(Icons.add, color: Colors.white),
                                    SizedBox(width: 8),
                                    Text(
                                      'Add measurement',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _downloadExport(String format) async {
    final rows = <List<String>>[
      ['Date', 'Age (days)', _showWeight ? 'Weight (kg)' : 'Height (cm)', 'Notes'],
    ];

    final sorted = [...widget.measurements]
      ..sort((a, b) => a.date.compareTo(b.date));

    for (final measurement in sorted) {
      rows.add([
        DateFormat('yyyy-MM-dd').format(measurement.date),
        measurement.ageDays.toString(),
        _showWeight
            ? (measurement.weightKg == null ? '' : measurement.weightKg!.toStringAsFixed(3))
            : (measurement.heightCm == null ? '' : measurement.heightCm!.toStringAsFixed(1)),
        measurement.notes ?? '',
      ]);
    }

    final csv = rows.map((row) => row.map((cell) => '"${cell.replaceAll('"', '""')}"').join(',')).join('\n');
    final excelXml = '''<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Baby Growth Data">
    <Table>
      ${rows.map((row) => '<Row>${row.map((cell) => '<Cell><Data ss:Type="String"><![CDATA[${cell.replaceAll(']]>', ']]]]><![CDATA[>')}]]></Data></Cell>').join()}</Row>').join()}
    </Table>
  </Worksheet>
</Workbook>''';

    try {
      final dir = await getTemporaryDirectory();
      final extension = format == 'csv' ? 'csv' : 'xls';
      final file = File('${dir.path}/baby-growth-${_showWeight ? 'weight' : 'height'}-${DateTime.now().toIso8601String().substring(0, 10)}.$extension');
      await file.writeAsString(format == 'csv' ? csv : excelXml, encoding: utf8);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Export saved to ${file.path}')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to export chart data.')),
      );
    }
  }
}

class _TooltipPointerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, paint);

    final borderPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class GrowthChartPainter extends CustomPainter {
  final List<double> values;
  final List<String> labels;
  final Color color;
  final int? selectedIndex;

  const GrowthChartPainter({
    required this.values,
    required this.labels,
    required this.color,
    this.selectedIndex,
  });

  static ui.TextDirection get _ltrDirection => ui.TextDirection.ltr;

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    final linePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    if (values.length < 2) {
      return;
    }

    final minValue = values.reduce((a, b) => a < b ? a : b) * 0.95;
    final maxValue = values.reduce((a, b) => a > b ? a : b) * 1.05;
    final leftPadding = 28.0;
    final rightPadding = 18.0;
    final topPadding = 22.0;
    final bottomPadding = 32.0;
    final chartHeight = size.height - topPadding - bottomPadding;
    final chartWidth = size.width - leftPadding - rightPadding;
    final range = maxValue - minValue == 0 ? 1.0 : maxValue - minValue;

    for (int i = 0; i < 4; i++) {
      final y = topPadding + (chartHeight / 3) * i;
      canvas.drawLine(Offset(leftPadding, y), Offset(size.width - rightPadding, y), gridPaint);
    }

    final points = <Offset>[];
    for (int i = 0; i < values.length; i++) {
      final x = leftPadding + (chartWidth / math.max(1, values.length - 1)) * i;
      final ratio = (values[i] - minValue) / range;
      final y = size.height - bottomPadding - ratio * chartHeight;
      points.add(Offset(x, y));
    }

    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (int i = 1; i < points.length; i++) {
      path.lineTo(points[i].dx, points[i].dy);
    }
    canvas.drawPath(path, linePaint);

    for (int i = 0; i < points.length; i++) {
      final point = points[i];
      final isSelected = selectedIndex != null && i == selectedIndex;
      canvas.drawCircle(point, isSelected ? 5 : 3, Paint()..color = color);
      if (isSelected) {
        canvas.drawCircle(point, 8, Paint()..color = color.withAlpha(52));
      }
    }

    final step = labels.length > 4 ? (labels.length / 4).floor() : 1;
    final textDirection = _ltrDirection;

    for (int i = 0; i < labels.length; i += step) {
      final x = leftPadding + (chartWidth / math.max(1, labels.length - 1)) * i;
      final textPainter = TextPainter(
        text: TextSpan(text: labels[i], style: const TextStyle(color: Colors.grey, fontSize: 10)),
        textDirection: textDirection,
      )..layout();
      textPainter.paint(canvas, Offset(x - textPainter.width / 2, size.height - 16));
    }

    final minPainter = TextPainter(
      text: TextSpan(
        text: values.reduce((a, b) => a < b ? a : b).toStringAsFixed(1),
        style: const TextStyle(color: Colors.grey, fontSize: 10),
      ),
      textDirection: textDirection,
    )..layout();
    minPainter.paint(canvas, Offset(0, topPadding - 6));

    final maxPainter = TextPainter(
      text: TextSpan(
        text: values.reduce((a, b) => a > b ? a : b).toStringAsFixed(1),
        style: const TextStyle(color: Colors.grey, fontSize: 10),
      ),
      textDirection: textDirection,
    )..layout();
    maxPainter.paint(canvas, Offset(size.width - maxPainter.width - 8, topPadding - 6));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class _MeasurementListCard extends StatelessWidget {
  final List<Measurement> measurements;

  const _MeasurementListCard({required this.measurements});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text('Recent measurements', style: Theme.of(context).textTheme.titleLarge),
            ),
            if (measurements.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('No measurements yet. Add the first baby check-in.'),
              )
            else
              ...measurements.take(5).map((measurement) {
                return ListTile(
                  title: Text(DateFormat('MMM d, yyyy').format(measurement.date)),
                  subtitle: Text(
                    '${measurement.weightKg != null ? formatWeightLabel(measurement.weightKg!) : '—'} • ${measurement.heightCm != null ? formatHeightLabel(measurement.heightCm!) : '—'}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(measurement.notes ?? 'No notes')),
                    );
                  },
                );
              }),
          ],
        ),
      ),
    );
  }
}

class MeasurementDetailScreen extends StatelessWidget {
  final Measurement measurement;

  const MeasurementDetailScreen({super.key, required this.measurement});

  @override
  Widget build(BuildContext context) {
    final userNotes = measurement.notes?.trim().isNotEmpty == true
        ? measurement.notes!
        : 'No user notes recorded for this measurement.';
    final aiNotes = 'No AI notes recorded for this measurement.';

    return Scaffold(
      appBar: AppBar(title: const Text('Measurement details')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                DateFormat('MMM d, yyyy').format(measurement.date),
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 20),
              _NotesSection(title: 'User notes', body: userNotes),
              const SizedBox(height: 20),
              _NotesSection(title: 'AI notes', body: aiNotes),
              const SizedBox(height: 20),
              if (measurement.weightKg != null || measurement.heightCm != null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Recorded values', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 8),
                      if (measurement.weightKg != null)
                        Text('Weight: ${formatWeightLabel(measurement.weightKg!)}'),
                      if (measurement.heightCm != null)
                        Text('Height: ${formatHeightLabel(measurement.heightCm!)}'),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NotesSection extends StatelessWidget {
  final String title;
  final String body;

  const _NotesSection({required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Text(body, style: const TextStyle(height: 1.5)),
        ],
      ),
    );
  }
}

class MeasurementEntryScreen extends StatefulWidget {
  final BabyProfile baby;

  const MeasurementEntryScreen({super.key, required this.baby});

  @override
  State<MeasurementEntryScreen> createState() => _MeasurementEntryScreenState();
}

class _MeasurementEntryScreenState extends State<MeasurementEntryScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _weightController = TextEditingController();
  final TextEditingController _heightController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();
  bool _saving = false;

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final weightText = _weightController.text.trim();
    final heightText = _heightController.text.trim();

    if (weightText.isEmpty || heightText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the baby weight and height.')),
      );
      return;
    }

    final weight = double.tryParse(weightText);
    final height = double.tryParse(heightText);
    if (weight == null || height == null || weight <= 0 || height <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Weight and height must be greater than 0.')),
      );
      return;
    }

    setState(() => _saving = true);
    final now = DateTime.now();
    final target = Measurement(
      babyId: widget.baby.id ?? 0,
      date: now,
      ageDays: now.difference(widget.baby.birthDate).inDays,
      weightKg: weight,
      heightCm: height,
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      createdAt: now,
      updatedAt: now,
    );

    try {
      await SupabaseService().upsertMeasurement(target);
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Save failed: $error')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Record measurement')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          child: Column(
            children: [
              TextFormField(
                controller: _weightController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Weight (kg)'),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) return 'Please enter the weight.';
                  final parsed = double.tryParse(value);
                  if (parsed == null || parsed <= 0) return 'Weight must be greater than 0.';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _heightController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Height (cm)'),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) return 'Please enter the height.';
                  final parsed = double.tryParse(value);
                  if (parsed == null || parsed <= 0) return 'Height must be greater than 0.';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _notesController,
                maxLines: 4,
                decoration: const InputDecoration(labelText: 'Notes (optional)'),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving ? const CircularProgressIndicator(strokeWidth: 2) : const Text('Save check-in'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
