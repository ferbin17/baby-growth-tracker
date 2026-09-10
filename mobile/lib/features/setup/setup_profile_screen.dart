import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/baby_profile.dart';
import '../../services/supabase_service.dart';
import '../auth/login_screen.dart';

class SetupProfileScreen extends StatefulWidget {
  final BabyProfile? existingProfile;

  const SetupProfileScreen({super.key, this.existingProfile});

  @override
  State<SetupProfileScreen> createState() => _SetupProfileScreenState();
}

class _SetupProfileScreenState extends State<SetupProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passcodeController = TextEditingController();
  final _birthWeightController = TextEditingController();
  final _birthHeightController = TextEditingController();
  Gender _gender = Gender.female;
  MeasurementFrequency _frequency = MeasurementFrequency.weekly;
  DateTime? _birthDate;
  DateTime? _startDate;
  bool _isSaving = false;
  bool _isResetting = false;

  @override
  void initState() {
    super.initState();
    final profile = widget.existingProfile;
    if (profile != null) {
      _nameController.text = profile.name;
      _usernameController.text = profile.username ?? '';
      _passcodeController.text = profile.passcode;
      _birthWeightController.text = profile.birthWeightKg.toString();
      _birthHeightController.text = profile.birthHeightCm.toString();
      _gender = profile.gender;
      _frequency = profile.measurementFrequency;
      _birthDate = profile.birthDate;
      _startDate = profile.startDate ?? profile.birthDate;
    }
  }

  Future<void> _pickDate(BuildContext context, bool isBirthDate) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );

    if (picked == null) return;

    setState(() {
      if (isBirthDate) {
        _birthDate = picked;
        if (_startDate == null || _startDate!.isBefore(picked)) {
          _startDate = picked;
        }
      } else {
        _startDate = picked;
      }
    });
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    if (widget.existingProfile == null && _birthDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select the baby birth date.')),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final service = SupabaseService();
      final baseProfile = widget.existingProfile ?? BabyProfile(
        name: _nameController.text.trim(),
        username: _usernameController.text.trim().isEmpty ? null : _usernameController.text.trim(),
        gender: _gender,
        birthDate: _birthDate ?? DateTime.now(),
        startDate: _startDate ?? _birthDate ?? DateTime.now(),
        passcode: _passcodeController.text.trim(),
        birthWeightKg: double.parse(_birthWeightController.text),
        birthHeightCm: double.parse(_birthHeightController.text),
        measurementFrequency: _frequency,
        stage: SetupStage.complete,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final profile = widget.existingProfile == null
          ? baseProfile
          : baseProfile.copyWith(
              username: _usernameController.text.trim().isEmpty ? null : _usernameController.text.trim(),
              passcode: _passcodeController.text.trim(),
              updatedAt: DateTime.now(),
            );

      final savedId = await service.upsertBabyProfile(profile);

      if (!mounted) return;

      if (savedId == 0) {
        throw StateError('Profile was not saved.');
      }

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const DashboardScreen()),
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to save profile: $error')),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _resetProfile() async {
    if (widget.existingProfile == null || widget.existingProfile!.id == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset profile?'),
        content: const Text(
          'This will delete the baby profile and all measurement data. You can set it up again from the beginning.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Reset'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isResetting = true);

    try {
      await SupabaseService().deleteBabyProfile(widget.existingProfile!.id!);
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to reset profile: $error')),
      );
    } finally {
      if (mounted) setState(() => _isResetting = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    _passcodeController.dispose();
    _birthWeightController.dispose();
    _birthHeightController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEditingExistingProfile = widget.existingProfile != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditingExistingProfile ? 'Edit profile' : 'Baby profile'),
        actions: isEditingExistingProfile
            ? [
                IconButton(
                  onPressed: _isResetting ? null : _resetProfile,
                  tooltip: 'Reset profile',
                  icon: _isResetting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.delete_outline),
                ),
              ]
            : null,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (isEditingExistingProfile) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Read-only details', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 12),
                        _ReadOnlyField(label: 'Name', value: widget.existingProfile!.name),
                        _ReadOnlyField(label: 'Gender', value: widget.existingProfile!.gender.displayName),
                        _ReadOnlyField(label: 'Birth date', value: DateFormat('MMM d, yyyy').format(widget.existingProfile!.birthDate)),
                        _ReadOnlyField(label: 'Birth weight', value: '${widget.existingProfile!.birthWeightKg.toStringAsFixed(1)} kg'),
                        _ReadOnlyField(label: 'Birth height', value: '${widget.existingProfile!.birthHeightCm.toStringAsFixed(1)} cm'),
                        _ReadOnlyField(label: 'Frequency', value: widget.existingProfile!.measurementFrequency.displayName),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ] else ...[
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Baby name'),
                    validator: (value) => value == null || value.trim().isEmpty ? 'Enter the baby name' : null,
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<Gender>(
                    initialValue: _gender,
                    decoration: const InputDecoration(labelText: 'Gender'),
                    items: Gender.values
                        .map((gender) => DropdownMenuItem(value: gender, child: Text(gender.displayName)))
                        .toList(),
                    onChanged: (value) => setState(() => _gender = value ?? Gender.female),
                  ),
                  const SizedBox(height: 16),
                  InkWell(
                    onTap: () => _pickDate(context, true),
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Birth date'),
                      child: Text(
                        _birthDate == null ? 'Select date' : DateFormat('MMM d, yyyy').format(_birthDate!),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  InkWell(
                    onTap: () => _pickDate(context, false),
                    child: InputDecorator(
                      decoration: const InputDecoration(labelText: 'Start date'),
                      child: Text(
                        _startDate == null ? 'Select date' : DateFormat('MMM d, yyyy').format(_startDate!),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _birthWeightController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Birth weight (kg)'),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) return 'Enter birth weight';
                      final parsed = double.tryParse(value);
                      if (parsed == null || parsed <= 0) return 'Weight must be greater than 0';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _birthHeightController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Birth height (cm)'),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) return 'Enter birth height';
                      final parsed = double.tryParse(value);
                      if (parsed == null || parsed <= 0) return 'Height must be greater than 0';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<MeasurementFrequency>(
                    initialValue: _frequency,
                    decoration: const InputDecoration(labelText: 'Measurement frequency'),
                    items: MeasurementFrequency.values
                        .map((frequency) => DropdownMenuItem(value: frequency, child: Text(frequency.displayName)))
                        .toList(),
                    onChanged: (value) => setState(() => _frequency = value ?? MeasurementFrequency.weekly),
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: _usernameController,
                  decoration: const InputDecoration(labelText: 'Username (optional)'),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passcodeController,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  decoration: const InputDecoration(labelText: 'Passcode (4 digits)'),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) return 'Passcode is required';
                    if (!RegExp(r'^\d{4}$').hasMatch(value.trim())) return 'Passcode must be 4 digits';
                    return null;
                  },
                ),
                const SizedBox(height: 28),
                ElevatedButton(
                  onPressed: _isSaving ? null : _saveProfile,
                  child: _isSaving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(isEditingExistingProfile ? 'Update profile' : 'Save profile'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  final String label;
  final String value;

  const _ReadOnlyField({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 104,
            child: Text(label, style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('Dashboard screen placeholder — next step is growth and measurement screens.')),
      ),
    );
  }
}
